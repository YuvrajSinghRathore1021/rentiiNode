const express = require('express');
const router = express.Router();
const multer = require("multer");
const path = require("path");
const db = require('../../db/ConnectionSql');
// configure upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/profile/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });
router.post("/user/profile", upload.single("profile"), async (req, res) => {
  const userId = req.user.user_id;
  const filePath = `/uploads/profile/${req.file.filename}`;

  try {
    await db.promise().query("UPDATE users SET profile_picture_url = ? WHERE user_id = ?", [filePath, userId]);
    res.json({ status: true, message: "Profile image uploaded", image: filePath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: "Upload failed" });
  }

});




module.exports = router;