package com.megna.backend;

import com.megna.backend.domain.enums.PropertyStatus;
import com.megna.backend.domain.enums.SellerWorkflowStatus;
import com.megna.backend.interfaces.rest.dto.property.AdminPropertySellerReviewAction;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;

class WorkflowStatusContractTest {

    @Test
    void propertyStatusEnumTokensShouldRemainFrontendCompatible() {
        assertArrayEquals(
                new String[]{"DRAFT", "ACTIVE", "CLOSED"},
                enumNames(PropertyStatus.values())
        );
    }

    @Test
    void sellerWorkflowEnumTokensShouldRemainFrontendCompatible() {
        assertArrayEquals(
                new String[]{"DRAFT", "SUBMITTED", "CHANGES_REQUESTED", "PUBLISHED", "CLOSED"},
                enumNames(SellerWorkflowStatus.values())
        );
    }

    @Test
    void sellerReviewActionEnumTokensShouldRemainFrontendCompatible() {
        assertArrayEquals(
                new String[]{"REQUEST_CHANGES", "PUBLISH"},
                enumNames(AdminPropertySellerReviewAction.values())
        );
    }

    private static String[] enumNames(Enum<?>[] values) {
        String[] names = new String[values.length];
        for (int i = 0; i < values.length; i += 1) {
            names[i] = values[i].name();
        }
        return names;
    }
}
