package com.iwt.invisibleworktracker.entity.workentry;

import com.iwt.invisibleworktracker.entity.organization.Organization;
import com.iwt.invisibleworktracker.entity.user.User;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "work_entries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"organization", "user", "photos"})
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class WorkEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @OneToMany(
            mappedBy = "workEntry",
            cascade = CascadeType.REMOVE,
            orphanRemoval = true
    )
    @Builder.Default
    private Set<WorkEntryPhoto> photos = new LinkedHashSet<>();

    @Column(name = "job_name", nullable = false, length = 150)
    private String jobName;

    @Column(name = "job_address", nullable = false, length = 255)
    private String jobAddress;

    @Column(name = "customer_name", length = 150)
    private String customerName;

    @Column(name = "customer_phone", length = 40)
    private String customerPhone;

    @Column(name = "customer_email", length = 150)
    private String customerEmail;

    @Column(name = "customer_contact_name", length = 150)
    private String customerContactName;

    @Column(name = "work_type", nullable = false, length = 100)
    private String workType;

    @Column(nullable = false, length = 2000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private WorkEntryStatus status;

    @Column(name = "work_date")
    private LocalDate workDate;

    @Column(name = "scheduled_start_time")
    private LocalTime scheduledStartTime;

    @Column(name = "arrival_window", length = 100)
    private String arrivalWindow;

    @Column(name = "estimated_duration", length = 80)
    private String estimatedDuration;

    @Column(name = "assigned_crew", length = 500)
    private String assignedCrew;

    @Column(name = "site_access_notes", length = 1000)
    private String siteAccessNotes;

    @Column(name = "internal_notes", length = 1000)
    private String internalNotes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (this.status == null) {
            this.status = WorkEntryStatus.DRAFT;
        }

        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
