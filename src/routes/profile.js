const express = require('express');
const router = express.Router();
const db = require('../../db/ConnectionSql');

router.get("/user", async (req, res) => {
  const userId = req.user.user_id;

  try {
    const [user] = await db.promise().query("SELECT user_id, name, email, phone_number, profile_picture_url, about FROM users WHERE user_id = ?", [userId]);

    if (user.length === 0) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    res.json({ status: true, data: user[0] });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ status: false, message: "Server error" });
  }
});



router.put("/user/update", async (req, res) => {
  const userId = req.user.user_id;
  const { name, email, phone_number, about } = req.body;

  try {
    await db.promise().query(
      "UPDATE users SET name = ?, email = ?, phone_number = ?, about = ?, updated_at = NOW() WHERE user_id = ?",
      [name, email, phone_number, about, userId]
    );

    res.json({ status: true, message: "Profile updated successfully" });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

// Address

router.get("/userAddress", async (req, res) => {
  const userId = req.user.user_id;

  try {
    const [user] = await db.promise().query("SELECT address_id, user_id, street_address, city, state, postal_code, country FROM user_addresses WHERE user_id = ?", [userId]);

    if (user.length === 0) {
      let NewData = {
        address_id: 0,
        user_id: userId,
        street_address: "",
        city: "",
        state: "",
        postal_code: "",
        country: ""
      }
      return res.status(200).json({ status: true, data: NewData, message: "User Address not found" });
    }

    res.json({ status: true, data: user[0] || NewData });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

router.put("/updateAddress", async (req, res) => {
  const userId = req.user.user_id;
  const { country, city, state, postal_code, address_id } = req.body;

  try {
    let Query = '';
    let data = [];
    if (address_id) {
      // update
      Query = "UPDATE user_addresses SET country=?, city=?, state=?, postal_code=? WHERE user_id = ? and address_id = ?";
      data = [country, city, state, postal_code, userId, address_id];
    } else {
      // insert 
      Query = "INSERT INTO user_addresses (user_id, country, city, state, postal_code) VALUES (?, ?, ?, ?, ?)";
      data = [userId, country, city, state, postal_code];
    }
    await db.promise().query(Query, data);

    res.json({ status: true, message: "Profile updated successfully" });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ status: false, message: "Server error" });
  }
});


// Export the router
module.exports = router;