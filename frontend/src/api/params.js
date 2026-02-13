export function cleanParams(params = {}) {
    const cleaned = {};

    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return;
        cleaned[key] = value;
    });

    return cleaned;
}

// Spring Pageable expects: page, size, sort (repeatable)
export function buildPageParams(pageOpts = {}) {
    const { page = 0, size = 20, sort } = pageOpts;

    const params = { page, size };

    // allow sort to be string OR array
    if (sort !== undefined && sort !== null && sort !== "") {
        params.sort = sort;
    }

    return cleanParams(params);
}