const homeService = require('../services/homeService');

const getHomeData = async (req, res) => {
    try {
        const data = await homeService.getHomeData(req.user);
        res.json({ status: true, data });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
};

module.exports = {
    getHomeData
};