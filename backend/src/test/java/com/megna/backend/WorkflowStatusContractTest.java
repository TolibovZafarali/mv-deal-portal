package com.megna.backend;

import com.megna.backend.domain.enums.PropertyStatus;
import com.megna.backend.domain.enums.SellerWorkflowStatus;
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
                new String[]{"DRAFT", "SUBMITTED", "PUBLISHED", "CLOSED"},
                enumNames(SellerWorkflowStatus.values())
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
