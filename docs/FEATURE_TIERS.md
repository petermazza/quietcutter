# QuietCutter Feature Tiers

## 🎯 **Feature Comparison**

| Feature | 🚫 Signed Out | ✅ Free | 👑 Pro |
|---------|---------------|---------|--------|
| **File Upload** | ❌ No | ✅ 1 file at a time | ✅ Up to 3 files |
| **Max File Size** | ❌ - | ✅ 100 MB | ✅ 500 MB |
| **File Formats** | ❌ - | ✅ MP3, WAV, OGG, FLAC, M4A | ✅ All + MP4, MOV, AVI, MKV, WEBM |
| **Projects** | ❌ No | ✅ 1 project | ✅ Unlimited |
| **Custom Presets** | ❌ No | ❌ No | ✅ Unlimited |
| **Audio Preview** | ❌ No | ❌ No | ✅ Yes |
| **Batch Download** | ❌ No | ❌ No | ✅ Yes |
| **Bulk Download All** | ❌ No | ❌ No | ✅ Yes |
| **Output Formats** | ❌ - | ✅ MP3 only | ✅ MP3, WAV, FLAC |
| **Processing Priority** | ❌ - | Standard | ✅ Priority Queue |
| **File Retention** | ❌ - | ✅ 7 days | ✅ 30 days |
| **Support** | ❌ No | Email | ✅ Priority Email |

---

## 🚫 **SIGNED OUT (Guest)**

### What You Can Do:
- ❌ **Nothing** - Must sign in to use QuietCutter

### Limitations:
- Cannot upload files
- Cannot access any features
- No file storage

### Call to Action:
> **"Sign in to start removing silence from your audio files"**

---

## ✅ **FREE (Signed In)**

### What You Can Do:
- ✅ Upload **1 audio file** at a time
- ✅ Max file size: **100 MB**
- ✅ Supported formats: **MP3, WAV, OGG, FLAC, M4A**
- ✅ Use **2 basic presets** (Podcast, Lecture)
- ✅ **1 project** (auto-managed)
- ✅ Output format: **MP3 only**
- ✅ Download processed files
- ✅ Files kept for **7 days**

### Limitations:
- ❌ No batch upload (1 file at a time)
- ❌ No video processing
- ❌ No custom presets
- ❌ No audio preview
- ❌ No batch download
- ❌ No WAV/FLAC output
- ❌ Only 1 project (oldest deleted when full)
- ❌ Standard processing queue

### Upgrade Prompts:
- **When uploading 2+ files:** "Batch upload is a Pro feature. Upgrade to upload up to 3 files at once."
- **When file > 100MB:** "File too large. Free users: 100MB max. Upgrade to Pro for 500MB uploads."
- **When trying video:** "Video processing is a Pro feature. Upgrade to process MP4, MOV, AVI, MKV, WEBM."
- **When creating 2nd project:** "Free users get 1 project. Upgrade to Pro for unlimited projects."
- **When trying custom preset:** "Custom presets are a Pro feature."
- **When trying audio preview:** "Audio preview is a Pro feature."
- **When trying batch download:** "Batch download is a Pro feature."

---

## 👑 **PRO (Paid Subscription)**

### What You Can Do:
- ✅ Upload **up to 3 files** at once
- ✅ Max file size: **500 MB**
- ✅ Supported formats: **All audio + video** (MP3, WAV, OGG, FLAC, M4A, MP4, MOV, AVI, MKV, WEBM)
- ✅ Use **all 4 presets** + create **unlimited custom presets**
- ✅ **Unlimited projects**
- ✅ Output formats: **MP3, WAV, FLAC**
- ✅ **Audio preview** before download
- ✅ **Batch download** multiple files as ZIP
- ✅ **Bulk download** all files
- ✅ **Priority processing** queue
- ✅ Files kept for **30 days**
- ✅ **Priority email support**

### Pro-Only Features:
- 🎬 Video silence removal
- 🎛️ Custom presets (save your settings)
- 🎵 Audio preview player
- 📦 Batch operations
- 🚀 Priority processing
- 📁 Unlimited projects
- 💾 Extended file retention (30 days)
- 🎯 Advanced output formats (WAV, FLAC)

---

## 💰 **PRICING**

### Free Forever
- **$0/month**
- Perfect for occasional use
- 1 file at a time, 100MB max
- MP3 output only

### Pro
- **$9.99/month** or **$79.99/year** (save 33%)
- Unlimited processing
- Video support
- Advanced features
- Priority support

---

## 🔒 **FEATURE GATING IMPLEMENTATION**

### Backend Enforcement

```typescript
// Check user tier
const userId = req.user?.id || req.user?.claims?.sub || null;
const isPro = await checkIsPro(userId);
const isFree = !!userId && !isPro;
const isGuest = !userId;

// File size limits
const FREE_FILE_SIZE_LIMIT = 100 * 1024 * 1024; // 100MB
const PRO_FILE_SIZE_LIMIT = 500 * 1024 * 1024;  // 500MB

// Project limits
const FREE_PROJECT_LIMIT = 1;
const PRO_PROJECT_LIMIT = Infinity;

// File retention
const FREE_RETENTION_DAYS = 7;
const PRO_RETENTION_DAYS = 30;

// Batch upload
const FREE_BATCH_SIZE = 1;
const PRO_BATCH_SIZE = 3;
```

### Frontend Visual Indicators

```tsx
// Pro badge
<Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600">
  <Crown className="h-3 w-3 mr-1" />
  PRO
</Badge>

// Locked feature
<Button disabled={!isPro} onClick={handleFeature}>
  {!isPro && <Lock className="h-4 w-4 mr-2" />}
  {featureName}
</Button>

// Upgrade prompt
{!isPro && (
  <div className="text-sm text-gray-600">
    <Lock className="h-3 w-3 inline mr-1" />
    Pro feature - <Link to="/upgrade">Upgrade now</Link>
  </div>
)}
```

---

## 🎨 **UI DIFFERENTIATION**

### Preset Cards
```tsx
const presets = [
  { name: "Podcast", icon: Mic, free: true },
  { name: "Lecture", icon: GraduationCap, free: true },
  { name: "Screen Recording", icon: Monitor, free: false }, // PRO
  { name: "Interview", icon: Users, free: false }, // PRO
];

{presets.map(preset => (
  <Card className={!preset.free && !isPro ? "opacity-50" : ""}>
    <CardContent>
      <preset.icon />
      <span>{preset.name}</span>
      {!preset.free && (
        <Badge variant="secondary">
          <Crown className="h-3 w-3" /> PRO
        </Badge>
      )}
    </CardContent>
  </Card>
))}
```

### Upload Area
```tsx
<div className="border-2 border-dashed rounded-lg p-8">
  <Upload className="h-12 w-12 mx-auto mb-4" />
  <h3>Upload Files</h3>
  <p className="text-sm text-gray-600">
    {isGuest && "Sign in to upload files"}
    {isFree && "Max 1 file, 100MB (MP3, WAV, OGG, FLAC, M4A)"}
    {isPro && "Up to 3 files, 500MB (All audio + video formats)"}
  </p>
  {isFree && (
    <Button variant="link" onClick={() => setShowPricing(true)}>
      Upgrade for batch upload & video support
    </Button>
  )}
</div>
```

### Project Limit Indicator
```tsx
{isFree && (
  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
    <div className="flex items-center gap-2">
      <AlertCircle className="h-4 w-4 text-yellow-600" />
      <span className="text-sm">
        Free users get 1 project. Oldest files deleted when full.
      </span>
    </div>
    <Button size="sm" variant="link" onClick={() => setShowPricing(true)}>
      Upgrade for unlimited projects
    </Button>
  </div>
)}
```

---

## 📊 **CONVERSION STRATEGY**

### Upgrade Triggers
1. **File too large** → "Upgrade to Pro for 500MB uploads"
2. **Batch upload attempt** → "Upgrade to upload 3 files at once"
3. **Video upload** → "Upgrade to process video files"
4. **2nd project** → "Upgrade for unlimited projects"
5. **Custom preset** → "Upgrade to save custom presets"
6. **Audio preview** → "Upgrade to preview before download"
7. **Batch download** → "Upgrade to download multiple files"

### Upgrade CTA Placement
- ✅ Upload modal (when hitting limits)
- ✅ Preset selector (locked presets)
- ✅ Project list (when at limit)
- ✅ File list (batch operations)
- ✅ Settings (custom presets)
- ✅ Navigation (upgrade button)

---

## 🚀 **IMPLEMENTATION CHECKLIST**

### Backend
- [x] File size limits enforced
- [x] Batch upload limits enforced
- [x] Project limits enforced
- [x] Custom presets require Pro
- [x] Audio preview requires Pro
- [x] Batch download requires Pro
- [ ] File retention cleanup (7 days free, 30 days pro)
- [ ] Processing priority queue

### Frontend
- [ ] Pro badge component
- [ ] Locked feature indicators
- [ ] Upgrade prompts
- [ ] Feature comparison table
- [ ] Pricing modal
- [ ] Tier-specific UI states
- [ ] Visual differentiation

### Testing
- [ ] Test as guest (no access)
- [ ] Test as free user (limits enforced)
- [ ] Test as pro user (all features)
- [ ] Test upgrade flow
- [ ] Test downgrade behavior

---

**Last Updated:** 2026-02-15  
**Status:** Backend limits enforced, frontend UI pending
