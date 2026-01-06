const multer = require('multer');
const fs = require('fs');
const path = require('path');

function uploadFile(folderName) {
    console.log(folderName)

    // Create folder if not exists
    const uploadPath = path.join(__dirname, "../../uploads", folderName);
    if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
    }
    // Storage Logic
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, uploadPath);
        },
        filename: function (req, file, cb) {
            const uniqueName = Date.now() + "-" + file.originalname;
            cb(null, uniqueName);
        }
    });

    return multer({ storage: storage }).single("file");
}

module.exports = uploadFile;
