const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { cloudinary, hasCloudinaryConfig } = require('../config/cloudinary');
const { UPLOAD_DIR } = require('../config/uploads');
const { inferAttachmentKind, toPublicUrl } = require('../utils/attachments');

const sanitizeFileName = (fileName) => {
  const extension = path.extname(fileName || '').toLowerCase();
  const baseName = path
    .basename(fileName || 'file', extension)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'file';

  return `${Date.now()}-${crypto.randomUUID()}-${baseName}${extension}`;
};

const formatUploadedFile = ({ url, name, size, mimeType, storage }, req) => ({
  kind: inferAttachmentKind({ mimeType, url }),
  url: toPublicUrl(url, req),
  name,
  size,
  mimeType,
  storage,
});

const uploadToCloudinary = (file) =>
  new Promise((resolve, reject) => {
    const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

    cloudinary.uploader.upload(
      dataUri,
      {
        folder: 'dot-jordan',
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        return resolve(
          formatUploadedFile({
            url: result.secure_url,
            name: file.originalname,
            size: file.size,
            mimeType: file.mimetype,
            storage: 'cloudinary',
          })
        );
      }
    );
  });

const saveLocally = async (file, req) => {
  await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });

  const safeName = sanitizeFileName(file.originalname);
  const filePath = path.join(UPLOAD_DIR, safeName);

  await fs.promises.writeFile(filePath, file.buffer);

  return formatUploadedFile(
    {
      url: `/uploads/${safeName}`,
      name: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      storage: 'local',
    },
    req
  );
};

const uploadFiles = async (req, res) => {
  try {
    const files = req.files || [];

    if (!files.length) {
      return res.status(400).json({ success: false, message: 'يرجى اختيار ملف واحد على الأقل' });
    }

    const uploadedFiles = await Promise.all(
      files.map((file) => (hasCloudinaryConfig ? uploadToCloudinary(file) : saveLocally(file, req)))
    );

    return res.status(201).json({
      success: true,
      data: uploadedFiles,
    });
  } catch (error) {
    console.error('uploadFiles error:', error);
    return res.status(500).json({ success: false, message: 'تعذر رفع الملف' });
  }
};

module.exports = { uploadFiles };
