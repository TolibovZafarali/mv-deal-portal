package com.megna.backend.infrastructure.security;

import com.megna.backend.domain.entity.Admin;
import com.megna.backend.domain.repository.AdminRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminBootstrapRunnerTest {

    @Mock
    private AdminRepository adminRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Test
    void bootstrapDoesNotRecreateConfiguredAdminWhenAnAdminAlreadyExists() throws Exception {
        AdminBootstrapRunner runner = runner("admin@megna-realestate.com", "AdminPass123!");
        when(adminRepository.count()).thenReturn(1L);

        runner.run(null);

        verify(adminRepository, never()).save(org.mockito.ArgumentMatchers.any(Admin.class));
        verify(passwordEncoder, never()).encode(org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void bootstrapCreatesNormalizedAdminWhenTableIsEmpty() throws Exception {
        AdminBootstrapRunner runner = runner(" Contact@Megna.US ", "AdminPass123!");
        when(adminRepository.count()).thenReturn(0L);
        when(passwordEncoder.encode("AdminPass123!")).thenReturn("encoded-password");

        runner.run(null);

        ArgumentCaptor<Admin> captor = ArgumentCaptor.forClass(Admin.class);
        verify(adminRepository).save(captor.capture());
        assertEquals("contact@megna.us", captor.getValue().getEmail());
        assertEquals("encoded-password", captor.getValue().getPasswordHash());
    }

    private AdminBootstrapRunner runner(String email, String password) {
        AdminBootstrapRunner runner = new AdminBootstrapRunner(adminRepository, passwordEncoder);
        ReflectionTestUtils.setField(runner, "email", email);
        ReflectionTestUtils.setField(runner, "password", password);
        return runner;
    }
}
