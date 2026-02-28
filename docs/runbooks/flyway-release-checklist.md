# Flyway Release Checklist (Prod)

Scope: `mv-deal-backend` on Cloud Run with Cloud SQL MySQL (`megnarealestate`).

## 1) Migration authoring rules
- Do not modify an existing `V*.sql` that has run in any shared environment.
- Use expand-then-contract:
  - `Vx`: add nullable columns/tables/indexes.
  - `Vx+1`: backfill data.
  - `Vx+2`: enforce `NOT NULL`/FK/unique constraints.
- Keep each migration idempotent where possible and safe for partially populated data.

## 2) Pre-merge checks (required)
- Run locally against a clean/prod-like DB.
- Confirm app starts after migrate.
- Confirm no failed Flyway rows:

```sql
SELECT installed_rank, version, script, success
FROM flyway_schema_history
ORDER BY installed_rank;
```

Expected: no rows with `success = 0`.

## 3) Pre-prod safety steps (required)
- Create Cloud SQL backup before deployment:

```bash
gcloud sql backups create \
  --instance=mv-mysql \
  --project=megna-real-estate-backend
```

- Confirm prod runtime config is strict (not emergency mode):
  - `SPRING_FLYWAY_ENABLED=true`
  - `SPRING_FLYWAY_VALIDATE_ON_MIGRATE=true`
  - `SPRING_JPA_HIBERNATE_DDL_AUTO=validate`

## 4) Deploy sequence
1. Push migration commit to `main`.
2. Wait for Cloud Build trigger and monitor deploy:

```bash
PROJECT_ID="megna-real-estate-backend"
BUILD_ID="$(gcloud builds list --project "$PROJECT_ID" --sort-by=~createTime --limit=1 --format='value(id)')"
gcloud beta builds log --stream "$BUILD_ID" --project "$PROJECT_ID"
```

3. Verify ready revision and health:

```bash
gcloud run services describe mv-deal-backend \
  --project=megna-real-estate-backend \
  --region=us-central1 \
  --format='value(status.latestReadyRevisionName,status.latestCreatedRevisionName,status.url)'

curl -i https://mv-deal-backend-2ul3cg6loa-uc.a.run.app/actuator/health
```

Expected:
- `latestReadyRevisionName == latestCreatedRevisionName`
- health endpoint returns `HTTP 200`

## 5) If deploy fails
1. Pull revision logs (Cloud Run stdout/stderr), do not rely only on probe error.
2. Classify failure:
- Dependency/runtime error (e.g., `VerifyError`): fix dependency graph and redeploy.
- Flyway validation error: inspect `flyway_schema_history` and migration checksums/status.
- Hibernate schema validation error: schema drift exists; repair DB via proper migration or controlled manual fix.

3. Temporary emergency recovery (service-first, short-lived only):

```bash
gcloud run services update mv-deal-backend \
  --project=megna-real-estate-backend \
  --region=us-central1 \
  --update-env-vars=SPRING_FLYWAY_ENABLED=false,SPRING_FLYWAY_VALIDATE_ON_MIGRATE=false,SPRING_JPA_HIBERNATE_DDL_AUTO=none \
  --quiet
```

4. After service recovery, immediately:
- apply permanent DB/migration fix,
- re-enable strict config,
- redeploy and verify.

## 6) Break-glass policy
- Manual edits to `flyway_schema_history` are break-glass only.
- If used, record in an incident note with timestamp, SQL used, operator, and justification.
- Follow with a code migration that makes future environments consistent.

## 7) Post-deploy closeout
- Keep the backup created before deploy until validation window closes.
- Save incident/release notes under `docs/incidents/` when any manual DB action occurred.
- Confirm `infra/cloudrun/env-prod.yaml` matches runtime env to avoid config drift.
