import axios from "axios";
import { performance } from "perf_hooks";
import * as fs from "fs"; // ✅ Fix: Use named import
import * as path from "path"; // ✅ Fix: Use named import

interface ApiResponse {
  [key: string]: any; // Generic response type
}

const DATA_FOLDER = path.join(__dirname, "data");

// Ensure the 'data' directory exists
if (!fs.existsSync(DATA_FOLDER)) {
  fs.mkdirSync(DATA_FOLDER);
}

const createApiFetcher = (apiUrl: string) => {
  return async (): Promise<{ data: ApiResponse[]; timeTaken: number }> => {
    try {
      const startTime = performance.now();

      const response = await axios.get<ApiResponse[]>(apiUrl);

      const endTime = performance.now();
      const timeTaken = Number((endTime - startTime).toFixed(2));
      return { data: response.data, timeTaken };
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
  };
};

const saveDataToFile = async (fileName: string, data: any) => {
  try {
    const filePath = path.join(DATA_FOLDER, fileName);
    await fs.promises.writeFile(
      filePath,
      JSON.stringify(data, null, 2),
      "utf-8"
    );
    console.log(`✅ Data saved to ${filePath}`);
  } catch (error) {
    console.error(`❌ Error saving ${fileName}:`, error);
  }
};

const fetchBrandConnections = createApiFetcher(
  "https://storage.googleapis.com/guber-public/brands-task-files/brandConnections.json"
);
const fetchBrandsMapping = createApiFetcher(
  "https://storage.googleapis.com/guber-public/brands-task-files/brandsMapping.json"
);
const fetchPharmacyItems = createApiFetcher(
  "https://storage.googleapis.com/guber-public/brands-task-files/pharmacyItems.json"
);

const fetchData = async () => {
  try {
    const [brandConnections, brandsMapping, pharmacyItems] = await Promise.all([
      fetchBrandConnections(),
      fetchBrandsMapping(),
      fetchPharmacyItems(),
    ]);

    await saveDataToFile("brandConnections.json", brandConnections.data);
    await saveDataToFile("brandsMapping.json", brandsMapping.data);
    await saveDataToFile("pharmacyItems.json", pharmacyItems.data);
  } catch (error) {
    console.error("API call failed:", error);
  }
};

fetchData();
