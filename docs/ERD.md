```mermaid
erDiagram

        Role {
            ADMIN ADMIN
MANAGER MANAGER
TEACHER TEACHER
ENTERPRISE_MENTOR ENTERPRISE_MENTOR
STUDENT STUDENT
        }
    


        EntityStatus {
            ACTIVE ACTIVE
ARCHIVED ARCHIVED
        }
    


        StudentStatus {
            ACTIVE ACTIVE
SUSPENDED SUSPENDED
GRADUATED GRADUATED
WITHDRAWN WITHDRAWN
EXPELLED EXPELLED
        }
    


        ProgramType {
            STANDARD STANDARD
SHORT_COURSE SHORT_COURSE
        }
    


        QualificationLevel {
            PROFESSIONAL_EDUCATION_III_IV PROFESSIONAL_EDUCATION_III_IV
TECHNICAL_EDUCATION_V_VI TECHNICAL_EDUCATION_V_VI
VOCATIONAL_TRAINING_I_V VOCATIONAL_TRAINING_I_V
        }
    


        CurriculumVersionStatus {
            DRAFT DRAFT
APPROVED APPROVED
ARCHIVED ARCHIVED
        }
    


        ElectiveSelectionType {
            CREDIT_REQUIREMENT CREDIT_REQUIREMENT
COURSE_COUNT COURSE_COUNT
        }
    


        EnrollmentStatus {
            ACTIVE ACTIVE
COMPLETED COMPLETED
FAILED FAILED
CANCELLED CANCELLED
SUSPENDED SUSPENDED
        }
    


        EnrollmentSource {
            CURRICULUM CURRICULUM
STANDALONE STANDALONE
CLASS_BATCH CLASS_BATCH
        }
    


        CBTStatus {
            NOT_EVALUATED NOT_EVALUATED
COMPETENT COMPETENT
NOT_YET_COMPETENT NOT_YET_COMPETENT
RE_ASSESSMENT_REQ RE_ASSESSMENT_REQ
        }
    


        PromotionStatus {
            PENDING PENDING
APPROVED APPROVED
REJECTED REJECTED
CANCELLED CANCELLED
        }
    


        SubmissionType {
            TEXT TEXT
FILE FILE
LINK LINK
PRACTICAL_VIDEO PRACTICAL_VIDEO
PRACTICAL_PHOTO PRACTICAL_PHOTO
        }
    


        LessonGateTrigger {
            VIDEO_TIMESTAMP VIDEO_TIMESTAMP
PDF_PAGE PDF_PAGE
        }
    


        QuestionType {
            MULTIPLE_CHOICE MULTIPLE_CHOICE
TRUE_FALSE TRUE_FALSE
SHORT_ANSWER SHORT_ANSWER
MATCHING MATCHING
        }
    


        MediaAssetType {
            IMAGE IMAGE
PDF PDF
AUDIO AUDIO
MARKDOWN MARKDOWN
VIDEO_RAW VIDEO_RAW
VIDEO_HLS VIDEO_HLS
OTHER OTHER
        }
    


        LiveSessionStatus {
            SCHEDULED SCHEDULED
LIVE LIVE
ENDED ENDED
CANCELLED CANCELLED
        }
    


        LibraryBookStatus {
            DRAFT DRAFT
PUBLISHED PUBLISHED
ARCHIVED ARCHIVED
        }
    


        LibraryAccessAction {
            VIEW VIEW
DOWNLOAD DOWNLOAD
        }
    
  "User" {
    String id "🗝️"
    String username 
    String email 
    String passwordHash 
    String fullName 
    String registerNumber "❓"
    String code 
    Role roles 
    String avatarUrl "❓"
    String phone "❓"
    Boolean notificationEmail 
    Boolean notificationInApp 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "StudentProfile" {
    StudentStatus status 
    Int enrollmentYear "❓"
    DateTime graduatedAt "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "StaffProfile" {
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "Company" {
    String id "🗝️"
    String name 
    String registerNumber "❓"
    String address "❓"
    String phone "❓"
    String email "❓"
    String website "❓"
    EntityStatus status 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "EnterpriseMentorProfile" {
    String jobTitle "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "Department" {
    String id "🗝️"
    String name 
    String code 
    EntityStatus status 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "AcademicYear" {
    String id "🗝️"
    String name 
    DateTime startDate 
    DateTime endDate 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "Program" {
    String id "🗝️"
    String name 
    String code 
    String shortName "❓"
    Int durationMonths 
    ProgramType programType 
    QualificationLevel qualificationLevel 
    EntityStatus status 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "ClassGroup" {
    String id "🗝️"
    String name 
    String code 
    EntityStatus status 
    Int gradeLevel "❓"
    Int cohortYear "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "StudentClassMembership" {
    String id "🗝️"
    DateTime startDate 
    DateTime endDate "❓"
    Boolean isCurrent 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "CurriculumVersion" {
    String id "🗝️"
    Int versionNo 
    String versionName "❓"
    Int semesterCount 
    CurriculumVersionStatus status 
    DateTime approvedAt "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "CurriculumCategory" {
    String id "🗝️"
    String name 
    String code 
    String description "❓"
    Int sortOrder 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "ElectiveGroup" {
    String id "🗝️"
    String code 
    String name 
    Int minimumCredits "❓"
    Int minimumCourseCount "❓"
    ElectiveSelectionType selectionType 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "CurriculumItem" {
    String id "🗝️"
    Int sequenceNumber 
    Int gradeLevel "❓"
    Int theoryHours 
    Int schoolPracticeHours 
    Int workplacePracticeHours 
    Boolean isRequired 
    String notes "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "CurriculumItemSemester" {
    String id "🗝️"
    Int semesterNumber 
    Int credits 
    Int hours 
    DateTime createdAt 
    }
  

  "Course" {
    String id "🗝️"
    String title 
    String code 
    String description "❓"
    String coverImage "❓"
    Boolean isCBT 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "CourseTeacher" {
    DateTime assignedAt 
    }
  

  "Module" {
    String id "🗝️"
    String title 
    Int order 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "Lesson" {
    String id "🗝️"
    String title 
    Int order 
    String contentType 
    String contentBody "❓"
    Boolean isApproved 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "LessonPrerequisite" {

    }
  

  "Enrollment" {
    String id "🗝️"
    EnrollmentSource source 
    DateTime startDate 
    DateTime endDate "❓"
    EnrollmentStatus status 
    DateTime statusChangedAt 
    String statusReason "❓"
    CBTStatus cbtStatus 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "ProgressLog" {
    String id "🗝️"
    Boolean completed 
    DateTime completedAt "❓"
    Int timeSpentSec 
    DateTime lastAccess 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "StudentLessonNote" {
    String id "🗝️"
    String content 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "LessonGate" {
    String id "🗝️"
    LessonGateTrigger triggerType 
    Int triggerValue "❓"
    DateTime createdAt 
    }
  

  "StudentPromotion" {
    String id "🗝️"
    PromotionStatus status 
    Boolean eligible 
    Int completedRequiredCourses 
    Int requiredCourseCount 
    String reason "❓"
    DateTime approvedAt "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "Assignment" {
    String id "🗝️"
    String title 
    String description 
    DateTime dueDate "❓"
    Boolean isCBTRequired 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "Rubric" {
    String id "🗝️"
    String title 
    Float weight 
    Int order 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "RubricCriteria" {
    String id "🗝️"
    String description 
    Float points 
    Int order 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "Submission" {
    String id "🗝️"
    SubmissionType type 
    String content "❓"
    String linkUrl "❓"
    Float finalScore "❓"
    CBTStatus cbtResult 
    String feedback "❓"
    DateTime submittedAt 
    DateTime updatedAt 
    }
  

  "SubmissionAsset" {
    DateTime createdAt 
    }
  

  "RubricScore" {
    String id "🗝️"
    Float scoreEarned 
    String feedback "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "Question" {
    String id "🗝️"
    String text 
    QuestionType type 
    String explanation "❓"
    Float points 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "QuestionOption" {
    String id "🗝️"
    String value 
    String matchValue "❓"
    Boolean isCorrect 
    Int order 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "Quiz" {
    String id "🗝️"
    String title 
    Int timeLimitMin 
    Float passScore 
    Int maxAttempts "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "QuizQuestion" {
    Int order 
    }
  

  "QuizAttempt" {
    String id "🗝️"
    Int attemptNo 
    Float score "❓"
    Boolean passed "❓"
    CBTStatus cbtResult 
    DateTime startedAt 
    DateTime completedAt "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "QuizAnswer" {
    String id "🗝️"
    String answerText "❓"
    Json answerJson "❓"
    Boolean isCorrect "❓"
    Float scoreEarned "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "InternshipLog" {
    String id "🗝️"
    DateTime logDate 
    Float hoursWorked 
    String workSummary 
    Boolean safetyFollowed 
    String mentorFeedback "❓"
    Boolean isApproved 
    DateTime approvedAt "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "SkillBadge" {
    String id "🗝️"
    String badgeName 
    String badgeImage "❓"
    String criteriaMet 
    String blockchainTx "❓"
    DateTime issuedAt 
    }
  

  "JobVacancy" {
    String id "🗝️"
    String title 
    String description 
    String location 
    String salaryText "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "JobVacancyRequiredCourse" {

    }
  

  "Message" {
    String id "🗝️"
    String content 
    DateTime createdAt 
    DateTime readAt "❓"
    }
  

  "Announcement" {
    String id "🗝️"
    String title 
    String content 
    Role targetRole "❓"
    DateTime createdAt 
    DateTime expiresAt "❓"
    }
  

  "MediaAsset" {
    String id "🗝️"
    String bucketName 
    String objectKey 
    String publicUrl "❓"
    String hlsUrl "❓"
    MediaAssetType type 
    String originalName 
    String mimeType 
    BigInt sizeBytes 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "LibraryBook" {
    String id "🗝️"
    String title 
    String subtitle "❓"
    String author "❓"
    String isbn "❓"
    String publisher "❓"
    Int publishedYear "❓"
    String language 
    String description "❓"
    LibraryBookStatus status 
    Boolean downloadAllowed 
    DateTime approvedAt "❓"
    DateTime createdAt 
    DateTime updatedAt 
    DateTime archivedAt "❓"
    }
  

  "LibraryBookCourse" {

    }
  

  "LibraryBookProgram" {

    }
  

  "LibraryCategory" {
    String id "🗝️"
    String name 
    String code 
    String description "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "LibraryBookCategory" {

    }
  

  "LibraryTag" {
    String id "🗝️"
    String name 
    DateTime createdAt 
    }
  

  "LibraryBookTag" {

    }
  

  "LibraryBookAccessLog" {
    String id "🗝️"
    LibraryAccessAction action 
    String ipAddress "❓"
    String userAgent "❓"
    DateTime createdAt 
    }
  

  "LiveSession" {
    String id "🗝️"
    String title 
    String sessionCode 
    LiveSessionStatus status 
    DateTime scheduledAt "❓"
    DateTime startedAt "❓"
    DateTime endedAt "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "LiveAttendee" {
    String id "🗝️"
    DateTime joinedAt 
    DateTime leftAt "❓"
    }
  

  "LivePoll" {
    String id "🗝️"
    String question 
    Boolean isActive 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "LivePollOption" {
    String id "🗝️"
    String text 
    Int order 
    }
  

  "LivePollResponse" {
    String id "🗝️"
    DateTime createdAt 
    }
  

  "AuditLog" {
    String id "🗝️"
    String action 
    String entityType "❓"
    String entityId "❓"
    Json details "❓"
    String ipAddress "❓"
    DateTime timestamp 
    }
  
    "User" |o--}o "Role" : "enum:roles"
    "StudentProfile" |o--|| "User" : "user"
    "StudentProfile" |o--|| "StudentStatus" : "enum:status"
    "StaffProfile" |o--|| "User" : "user"
    "StaffProfile" }o--|o "Department" : "department"
    "Company" |o--|| "EntityStatus" : "enum:status"
    "EnterpriseMentorProfile" |o--|| "User" : "user"
    "EnterpriseMentorProfile" }o--|| "Company" : "company"
    "Department" |o--|| "EntityStatus" : "enum:status"
    "Program" |o--|| "ProgramType" : "enum:programType"
    "Program" |o--|| "QualificationLevel" : "enum:qualificationLevel"
    "Program" |o--|| "EntityStatus" : "enum:status"
    "Program" }o--|| "Department" : "department"
    "ClassGroup" |o--|| "EntityStatus" : "enum:status"
    "ClassGroup" }o--|| "Department" : "department"
    "ClassGroup" }o--|| "Program" : "program"
    "ClassGroup" }o--|| "AcademicYear" : "academicYear"
    "StudentClassMembership" }o--|| "StudentProfile" : "student"
    "StudentClassMembership" }o--|| "ClassGroup" : "classGroup"
    "CurriculumVersion" }o--|| "Program" : "program"
    "CurriculumVersion" }o--|| "AcademicYear" : "academicYear"
    "CurriculumVersion" |o--|| "CurriculumVersionStatus" : "enum:status"
    "CurriculumVersion" }o--|o "User" : "approvedBy"
    "ElectiveGroup" }o--|| "CurriculumVersion" : "curriculumVersion"
    "ElectiveGroup" |o--|| "ElectiveSelectionType" : "enum:selectionType"
    "CurriculumItem" }o--|| "CurriculumVersion" : "curriculumVersion"
    "CurriculumItem" }o--|| "CurriculumCategory" : "category"
    "CurriculumItem" }o--|| "Course" : "course"
    "CurriculumItem" }o--|o "ElectiveGroup" : "electiveGroup"
    "CurriculumItemSemester" }o--|| "CurriculumItem" : "curriculumItem"
    "Course" }o--|| "Department" : "department"
    "CourseTeacher" }o--|| "Course" : "course"
    "CourseTeacher" }o--|| "User" : "teacher"
    "Module" }o--|| "Course" : "course"
    "Lesson" }o--|| "Module" : "module"
    "LessonPrerequisite" }o--|| "Lesson" : "lesson"
    "LessonPrerequisite" }o--|| "Lesson" : "prerequisite"
    "Enrollment" |o--|| "EnrollmentSource" : "enum:source"
    "Enrollment" }o--|o "StudentProfile" : "student"
    "Enrollment" }o--|o "ClassGroup" : "classGroup"
    "Enrollment" }o--|o "CurriculumItem" : "curriculumItem"
    "Enrollment" }o--|o "Course" : "standaloneCourse"
    "Enrollment" |o--|| "EnrollmentStatus" : "enum:status"
    "Enrollment" }o--|o "User" : "statusChangedBy"
    "Enrollment" |o--|| "CBTStatus" : "enum:cbtStatus"
    "ProgressLog" }o--|| "User" : "student"
    "ProgressLog" }o--|| "Lesson" : "lesson"
    "StudentLessonNote" }o--|| "User" : "student"
    "StudentLessonNote" }o--|| "Lesson" : "lesson"
    "LessonGate" }o--|| "Lesson" : "lesson"
    "LessonGate" }o--|| "Quiz" : "quiz"
    "LessonGate" |o--|| "LessonGateTrigger" : "enum:triggerType"
    "StudentPromotion" }o--|| "User" : "student"
    "StudentPromotion" }o--|| "ClassGroup" : "fromClassGroup"
    "StudentPromotion" }o--|o "ClassGroup" : "toClassGroup"
    "StudentPromotion" }o--|| "AcademicYear" : "academicYear"
    "StudentPromotion" |o--|| "PromotionStatus" : "enum:status"
    "StudentPromotion" }o--|o "User" : "approvedBy"
    "Assignment" }o--|| "Lesson" : "lesson"
    "Rubric" }o--|| "Assignment" : "assignment"
    "RubricCriteria" }o--|| "Rubric" : "rubric"
    "Submission" |o--|| "SubmissionType" : "enum:type"
    "Submission" |o--|| "CBTStatus" : "enum:cbtResult"
    "Submission" }o--|| "User" : "student"
    "Submission" }o--|| "Assignment" : "assignment"
    "SubmissionAsset" }o--|| "Submission" : "submission"
    "SubmissionAsset" }o--|| "MediaAsset" : "asset"
    "RubricScore" }o--|| "Submission" : "submission"
    "RubricScore" }o--|| "RubricCriteria" : "criteria"
    "RubricScore" }o--|| "User" : "evaluator"
    "Question" }o--|| "Course" : "course"
    "Question" |o--|| "QuestionType" : "enum:type"
    "QuestionOption" }o--|| "Question" : "question"
    "Quiz" }o--|| "Lesson" : "lesson"
    "QuizQuestion" }o--|| "Quiz" : "quiz"
    "QuizQuestion" }o--|| "Question" : "question"
    "QuizAttempt" }o--|| "Quiz" : "quiz"
    "QuizAttempt" }o--|| "User" : "student"
    "QuizAttempt" |o--|| "CBTStatus" : "enum:cbtResult"
    "QuizAnswer" }o--|| "QuizAttempt" : "attempt"
    "QuizAnswer" }o--|| "Question" : "question"
    "QuizAnswer" }o--|| "User" : "student"
    "InternshipLog" }o--|| "User" : "student"
    "InternshipLog" }o--|o "User" : "mentor"
    "SkillBadge" }o--|| "User" : "student"
    "SkillBadge" }o--|| "Course" : "course"
    "JobVacancy" }o--|| "Company" : "company"
    "JobVacancyRequiredCourse" }o--|| "JobVacancy" : "vacancy"
    "JobVacancyRequiredCourse" }o--|| "Course" : "course"
    "Message" }o--|| "User" : "sender"
    "Message" }o--|| "User" : "receiver"
    "Message" }o--|o "Course" : "course"
    "Announcement" |o--|o "Role" : "enum:targetRole"
    "Announcement" }o--|o "User" : "targetUser"
    "Announcement" }o--|| "User" : "sender"
    "MediaAsset" |o--|| "MediaAssetType" : "enum:type"
    "MediaAsset" }o--|o "Lesson" : "lesson"
    "MediaAsset" }o--|o "Course" : "course"
    "MediaAsset" }o--|| "User" : "uploader"
    "LibraryBook" |o--|| "LibraryBookStatus" : "enum:status"
    "LibraryBook" }o--|| "User" : "createdBy"
    "LibraryBook" }o--|o "User" : "approvedBy"
    "LibraryBook" }o--|| "MediaAsset" : "pdfAsset"
    "LibraryBook" }o--|o "MediaAsset" : "coverAsset"
    "LibraryBookCourse" }o--|| "LibraryBook" : "book"
    "LibraryBookCourse" }o--|| "Course" : "course"
    "LibraryBookProgram" }o--|| "LibraryBook" : "book"
    "LibraryBookProgram" }o--|| "Program" : "program"
    "LibraryBookCategory" }o--|| "LibraryBook" : "book"
    "LibraryBookCategory" }o--|| "LibraryCategory" : "category"
    "LibraryBookTag" }o--|| "LibraryBook" : "book"
    "LibraryBookTag" }o--|| "LibraryTag" : "tag"
    "LibraryBookAccessLog" |o--|| "LibraryAccessAction" : "enum:action"
    "LibraryBookAccessLog" }o--|| "LibraryBook" : "book"
    "LibraryBookAccessLog" }o--|| "User" : "user"
    "LiveSession" }o--|| "Course" : "course"
    "LiveSession" }o--|| "User" : "teacher"
    "LiveSession" |o--|| "LiveSessionStatus" : "enum:status"
    "LiveAttendee" }o--|| "LiveSession" : "session"
    "LiveAttendee" }o--|| "User" : "student"
    "LivePoll" }o--|| "LiveSession" : "session"
    "LivePollOption" }o--|| "LivePoll" : "poll"
    "LivePollResponse" }o--|| "LivePoll" : "poll"
    "LivePollResponse" }o--|| "LivePollOption" : "option"
    "LivePollResponse" }o--|| "User" : "student"
    "AuditLog" }o--|| "User" : "user"
```
