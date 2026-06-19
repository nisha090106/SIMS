/**
 * Script: Generate barcodes for products with empty barcode field
 * Usage: node scripts/generateBarcodes.js
 * 
 * Generates barcodes in format: SIMS + product_id (padded to 8 digits)
 * Example: SIMS00000001, SIMS00000234, etc.
 */

import { sequelize, Product } from '../src/models/index.js';

const generateBarcodes = async () => {
  try {
    console.log('🔄 Starting barcode generation...\n');

    // Find all products with NULL barcode
    const productsWithoutBarcode = await Product.findAll({
      where: {
        barcode: null,
      },
    });

    if (productsWithoutBarcode.length === 0) {
      console.log('✅ All products already have barcodes!');
      process.exit(0);
    }

    console.log(`Found ${productsWithoutBarcode.length} products without barcodes\n`);

    // Update each product with generated barcode
    let successCount = 0;
    let errorCount = 0;

    for (const product of productsWithoutBarcode) {
      try {
        // Format: SIMS + product_id padded to 8 digits
        const barcode = `SIMS${product.product_id.toString().padStart(8, '0')}`;

        await product.update({ barcode });

        console.log(`✅ ${product.name} (ID: ${product.product_id}) → ${barcode}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error updating product ${product.product_id}: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Successfully updated: ${successCount} products`);
    if (errorCount > 0) {
      console.log(`❌ Errors: ${errorCount} products`);
    }
    console.log(`${'='.repeat(60)}\n`);

    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
};

generateBarcodes();
