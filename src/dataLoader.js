const fs = require('fs');
const path = require('path');

const loadJSON = (filename) => {
    const filePath = path.join(__dirname, './data', filename);
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const brandConnections = loadJSON('brandConnections.json');
const brandsMapping = loadJSON('brandsMapping.json');
const pharmacyItems = loadJSON('pharmacyItems.json');

module.exports = { brandConnections, brandsMapping, pharmacyItems };
