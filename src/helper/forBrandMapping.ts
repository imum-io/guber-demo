const fs = require('fs').promises;
const fs1 = require('fs')
const path = require('path');
const brandMapping = require('../../brandsMapping.json');

const deleteBIOAndNEB = async () => {
    try {
        const fileData = await fs.readFile(`${__dirname}/brandsMapping.json`, 'utf8');
        let valueData = JSON.parse(fileData)
        let updatedObject = {}
        for(const [key, value] of Object.entries(valueData)) {
            value.some(val => {
                if(val.toLowerCase() === "BIO".toLowerCase()) {
                    const updatedData = value.filter(x => x.toLowerCase() != "bio")
                    updatedObject = {...updatedObject, [key]: updatedData}
                }
                if(val.toLowerCase() === "NEB".toLowerCase()) {
                    const updatedData = value.filter(x => x.toLowerCase() != "neb")
                    updatedObject = {...updatedObject, [key]: updatedData}
                }
            })
        }
        valueData = {...valueData, updatedObject}
        delete valueData["bio"]
        delete valueData["neb"]
    } catch (err) {
        console.error("Error reading file:", err);
    }
};

const normalizeBabe = async () => {
    try {
        const fileData = await fs.readFile(`${__dirname}/brandsMapping.json`, 'utf8');
        let valueData = JSON.parse(fileData)
        let updatedObject = {}
        for(const [key, value] of Object.entries(valueData)) {
            value.some(val => {
                if(val.toLowerCase() === "Babē".toLowerCase()) {
                    const updatedData = value.filter(x => x.toLowerCase() !== "babē")
                    updatedData.push("babe")
                    updatedObject = {...updatedObject, [key]: updatedData}
                }
            })
            if(key.toLowerCase() === "babē") {
                delete valueData[key]
                valueData["babe"] = value
            }
        }
    } catch (error) {
        console.error("Error reading file:", error);
    }
}

const textInTheFrontValidation = async() => {
    const frontText = ["RICH", "RFF", "flex", "ultra", "gum", "beauty", "orto", "free", "112", "kin", "happy"]
    const fileData = await fs.readFile(`${process.cwd()}/brandsMapping.json`, 'utf8');
    let valueData = JSON.parse(fileData)
    let updatedObject = {}
    let updatedArray
    for(const [key, value] of Object.entries(valueData)) {
        let copyArray = [...value]
        let index = 0
        value.forEach(val => {
            frontText.forEach(front => {
                if(val.toString().toLowerCase() === front.toLowerCase()) {
                    updatedArray = copyArray.filter(x => x !== val)
                    frontText.forEach(f => {
                        if(f.toString().toLowerCase() === updatedArray[index]?.toString().toLowerCase()) index++
                    })
                    updatedArray.splice(index, 0, val)
                    index++
                    copyArray = [...updatedArray]
                    updatedObject = {...updatedObject, [key]: updatedArray}
                }
            })
        })
    }
    valueData = {...valueData, ...updatedObject}
    console.log(valueData["happy"])
}

const frontAndSecondWordSolution = async() => {
    try {
        const frontText = ["RICH", "RFF", "flex", "ultra", "gum", "beauty", "orto", "free", "112", "kin", "happy"]
        const frontOrSecondWords = ["heel", "contour", "nero", "rsv"]
        const fileData = await fs.readFile(`${process.cwd()}/brandsMapping.json`, 'utf8');
        let valueData = JSON.parse(fileData)
        let updatedObject = {}
        let updatedArray
        for(const [key, value] of Object.entries(valueData)) {
            let copyArray = [...value]
            value.forEach(val => {
                frontOrSecondWords.forEach(front => {
                    if(front.toString().toLowerCase() === val.toString().toLowerCase()) {
                        updatedArray = copyArray.filter(x => x !== val)
                        for (let i = 0; i < frontText.length; i++) {
                            if(frontText[i].toString().toLowerCase() === updatedArray[0]?.toString().toLowerCase()) {
                                updatedArray.splice(1, 0, val)
                                break
                            }
                        }
                        updatedArray.splice(0, 0, val)
                        copyArray = [...updatedArray]
                        updatedObject = {...updatedObject, [key]: updatedArray}
                    }
                })
            })
        }
        valueData = {...valueData, ...updatedObject}
        console.log(valueData["naveh pharma"])
    } catch (error) {
        console.error(error)
    }
}

const assignToSameBrand = async () => {
    class UnionFind {
        constructor() {
            this.parent = {};
        }

        find(x) {
            if (!this.parent[x]) this.parent[x] = x;
            if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]);
            return this.parent[x];
        }

        union(x, y) {
            const rootX = this.find(x);
            const rootY = this.find(y);
            if (rootX !== rootY) {
            this.parent[rootY] = rootX;
            }
        }
    }

    const uf = new UnionFind();
    Object.entries(brandMapping).forEach(([brand, aliases]) => {
        aliases.forEach(alias => uf.union(brand, alias));
    });
    const grouped = {};
    Object.keys(brandMapping).forEach(brand => {
        const root = uf.find(brand);
        if (!grouped[root]) grouped[root] = new Set();
        brandMapping[brand].forEach(alias => grouped[root].add(alias));
        grouped[root].add(brand);
    });
    const finalMapping = {};
    for (const [root, set] of Object.entries(grouped)) {
        const aliases = Array.from(set).sort();
        const canonical = aliases[0];
        finalMapping[canonical] = aliases;
    }

    fs1.writeFileSync(
        path.join(__dirname, 'normalizedBrands.json'),
        JSON.stringify(finalMapping, null, 2)
    );
}


assignToSameBrand()

module.exports = {
    deleteBIOAndNEB, 
    textInTheFrontValidation, 
    normalizeBabe, 
    frontAndSecondWordSolution
}