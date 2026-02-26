package com.megna.backend.application.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class FmrLookupServiceTest {

    private final FmrLookupService service = new FmrLookupService("fmr/st_louis_metro_fy2026.csv");

    @Test
    void lookupUsesTwoBedroomBandForTwoBeds() {
        assertEquals(new BigDecimal("990"), service.lookup("62001", 2));
    }

    @Test
    void lookupUsesFourBedroomBandForFourOrMoreBeds() {
        assertEquals(new BigDecimal("1990"), service.lookup("62025", 4));
        assertEquals(new BigDecimal("1990"), service.lookup("62025", 6));
    }

    @Test
    void lookupNormalizesZipPlus4Format() {
        assertEquals(new BigDecimal("1570"), service.lookup("63128-1234", 3));
    }

    @Test
    void lookupReturnsNullForMissingOrUnknownInputs() {
        assertNull(service.lookup(null, 2));
        assertNull(service.lookup("62001", null));
        assertNull(service.lookup("99999", 2));
        assertNull(service.lookup("12", 2));
    }
}
