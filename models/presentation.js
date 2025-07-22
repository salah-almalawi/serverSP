const mongoose = require('mongoose');
// نموذج العرض التقديمي (Presentation Model)
const presentationSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Auth',
    required: true
  },
  isDraft: {
    type: Boolean,
    required: true,
    default: true
  },
  mubdee: {
    guestImage: String,
    organization: String,
    welcomeText: String,
    guestName: String
  },
  typeSection: {
    presentationType: String,
    securityLevel: String,
    duration: String,
    presenter: {
      position: String,
      rank: String,
      name: String
    }
  },
  mission: {
    description: String
  },
  readiness: {
    humanResources: {
      officers: Number,
      personnel: Number,
      civilians: Number,
      contractors: Number,
      femalePersonnel: Number
    },
    weapons: [{
      name: String,
      total: Number,
      outOfService: Number
    }],
    vehicles: [{
      name: String,
      total: Number,
      outOfService: Number
    }],
    navalAssets: [{
      name: String,
      total: Number,
      outOfService: Number
    }],
    electronicSystems: [{
      name: String,
      total: Number,
      outOfService: Number
    }]
  },
  filePart6: String,
  filePart7: String,
  filePart8: String,
  filePart9: String,
  filePart10: String,
  securityOutput: {
    table: {
      columns: [String],
      rows: [String]
    },
    images: [String]
  },
  conclusion: {
    guestImage: String,
    closingText: String
  }
}, { timestamps: true });

presentationSchema.index({ owner: 1, createdAt: -1 });
presentationSchema.index({ owner: 1, updatedAt: -1 });
presentationSchema.index({ owner: 1, isDraft: 1 });

// إنشاء النموذج
const Presentation = mongoose.model('Presentation', presentationSchema);

// إضافة هذا السطر في النهاية لتصدير النموذج
module.exports = Presentation;