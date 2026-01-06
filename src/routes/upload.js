const express = require("express");
const router = express.Router();
const uploadFile = require("../helpers/uploadFile");

router.post("/upload", (req, res) => {
    const foldername = req.query.folder || "default";

    const upload = uploadFile(foldername);

    upload(req, res, function (err) {
        if (err) {
            return res.json({ status: 0, message: "Upload failed", error: err });
        }

        if (!req.file) {
            return res.json({ status: 0, message: "No file found" });
        }

        return res.json({
            status: 1,
            message: "File uploaded successfully",
            file: req.file.filename,
            path: `/uploads/${foldername}/${req.file.filename}`
        });

    });
});

module.exports = router;
