# Project README

## Overview

This project processes brand mappings and assigns brands to products based on known brand relationships. The data is fetched from external APIs and stored locally before processing.

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- TypeScript (v4 or higher)

## Setup

1. Clone the repository:

   ```sh
   git clone <repository-url>
   cd <repository-directory>
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

## Data Fetching

Before running the main processing function, you need to fetch the required data and populate the [data](http://_vscodecontentref_/0) folder.

1. Compile and execute the [fetchData.ts](http://_vscodecontentref_/1) script:
   ```sh
   tsc fetchData.ts && node fetchData.js
   ```

This will fetch the necessary data files and store them in the [data](http://_vscodecontentref_/2) folder.

## Running the Main Function

After fetching the data, you can run the main function to assign brands to products.

1. Run the following command:
   ```sh
   npm run start
   ```

This will execute the `assignBrandIfKnown` function, which will process the data and write the results to the `data/products.txt` file.

## File Structure

- [fetchData.ts](http://_vscodecontentref_/3): Script to fetch data from external APIs and populate the [data](http://_vscodecontentref_/4) folder.
- [brands.ts](http://_vscodecontentref_/5): Contains the `assignBrandIfKnown` function which processes the data and writes the results to `data/products.txt`.

## Notes

- Ensure that the [data](http://_vscodecontentref_/6) folder is populated with the necessary data files before running the main function.
- The results will be written to `data/products.txt`.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
