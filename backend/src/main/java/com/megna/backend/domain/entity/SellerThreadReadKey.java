package com.megna.backend.domain.entity;

import com.megna.backend.domain.enums.SellerThreadParticipantRole;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
@Embeddable
public class SellerThreadReadKey implements Serializable {

    @Column(name = "thread_id")
    private Long threadId;

    @Enumerated(EnumType.STRING)
    @Column(name = "principal_role", length = 20)
    private SellerThreadParticipantRole principalRole;

    @Column(name = "principal_id")
    private Long principalId;
}
