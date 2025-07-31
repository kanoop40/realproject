const mongoose = require('mongoose');

const groupChatSchema = new mongoose.Schema({
    groupName: {
        type: String,
        required: true,
        trim: true
    },
    groupImage: {
        type: String,
        default: null
    },
    groupAvatar: {
        type: String,
        default: null
    },
    description: {
        type: String,
        default: ''
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        role: {
            type: String,
            enum: ['admin', 'member'],
            default: 'member'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    autoInviteSettings: {
        enabled: {
            type: Boolean,
            default: false
        },
        criteria: {
            byClass: {
                enabled: {
                    type: Boolean,
                    default: false
                },
                groupCodes: [String] // รายการห้องเรียนที่เลือก
            },
            byStudentId: {
                enabled: {
                    type: Boolean,
                    default: false
                },
                pattern: String // รูปแบบรหัสนักศึกษา เช่น "67*" สำหรับรุ่น 67
            },
            byFaculty: {
                enabled: {
                    type: Boolean,
                    default: false
                },
                faculties: [String]
            },
            byDepartment: {
                enabled: {
                    type: Boolean,
                    default: false
                },
                departments: [String]
            }
        }
    },
    settings: {
        allowMemberInvite: {
            type: Boolean,
            default: true
        },
        allowMemberLeave: {
            type: Boolean,
            default: true
        },
        allowFileSharing: {
            type: Boolean,
            default: true
        },
        maxMembers: {
            type: Number,
            default: 500
        }
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index สำหรับการค้นหา
groupChatSchema.index({ groupName: 'text', description: 'text' });
groupChatSchema.index({ creator: 1 });
groupChatSchema.index({ 'members.user': 1 });

// Virtual สำหรับจำนวนสมาชิก
groupChatSchema.virtual('memberCount').get(function() {
    return this.members.length;
});

// Method สำหรับเพิ่มสมาชิก
groupChatSchema.methods.addMember = function(userId, role = 'member') {
    const existingMember = this.members.find(member => 
        member.user.toString() === userId.toString()
    );
    
    if (!existingMember) {
        this.members.push({
            user: userId,
            role: role,
            joinedAt: new Date()
        });
    }
    
    return this.save();
};

// Method สำหรับลบสมาชิก
groupChatSchema.methods.removeMember = function(userId) {
    this.members = this.members.filter(member => 
        member.user.toString() !== userId.toString()
    );
    
    return this.save();
};

// Method สำหรับตรวจสอบสิทธิ์แอดมิน
groupChatSchema.methods.isAdmin = function(userId) {
    const member = this.members.find(member => 
        member.user.toString() === userId.toString()
    );
    
    return member && (member.role === 'admin' || 
           this.creator.toString() === userId.toString());
};

// Method สำหรับ Auto Invite
groupChatSchema.methods.checkAutoInviteEligibility = function(user) {
    const { autoInviteSettings } = this;
    
    if (!autoInviteSettings.enabled) return false;
    
    const { criteria } = autoInviteSettings;
    
    // ตรวจสอบตามห้องเรียน
    if (criteria.byClass.enabled && user.groupCode) {
        if (criteria.byClass.groupCodes.includes(user.groupCode)) {
            return true;
        }
    }
    
    // ตรวจสอบตามรหัสนักศึกษา
    if (criteria.byStudentId.enabled && user.studentId) {
        const pattern = criteria.byStudentId.pattern;
        if (pattern && user.studentId.match(new RegExp(pattern))) {
            return true;
        }
    }
    
    // ตรวจสอบตามคณะ
    if (criteria.byFaculty.enabled && user.faculty) {
        if (criteria.byFaculty.faculties.includes(user.faculty)) {
            return true;
        }
    }
    
    // ตรวจสอบตามหน่วยงาน
    if (criteria.byDepartment.enabled && user.department) {
        if (criteria.byDepartment.departments.includes(user.department)) {
            return true;
        }
    }
    
    return false;
};

module.exports = mongoose.model('GroupChat', groupChatSchema);
