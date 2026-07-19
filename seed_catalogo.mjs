import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://hgjcmsqforkvcfatygsl.supabase.co';
const supabaseKey = 'sb_publishable_Ij2NSppTJRCxCpLzOOtLNA_OZY1RKZS';

const catalogoDir = path.join(process.cwd(), 'assets', 'catalogo');

async function uploadCatalog() {
    console.log('Iniciando carga del catálogo...');
    const folders = fs.readdirSync(catalogoDir).filter(f => fs.statSync(path.join(catalogoDir, f)).isDirectory());

    for (const folder of folders) {
        const folderPath = path.join(catalogoDir, folder);
        const files = fs.readdirSync(folderPath).filter(f => f.match(/\.(jpg|jpeg|png|webp|gif)$/i));

        for (const [index, file] of files.entries()) {
            const productName = `Diseño ${folder}${files.length > 1 ? ' ' + (index + 1) : ''}`;
            const imagePath = `assets/catalogo/${folder}/${file}`;

            const product = {
                name: productName,
                price: 1500, // Precio base
                category: 'COLECCIONES', // Lo subimos en Colecciones
                description: `Prenda personalizada con diseño de ${folder}. Este diseño forma parte de nuestro catálogo digital exclusivo.`,
                image: imagePath,
                sizes: ['S', 'M', 'L', 'XL']
            };

            const response = await fetch(`${supabaseUrl}/rest/v1/products`, {
                method: 'POST',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(product)
            });

            if (!response.ok) {
                const err = await response.text();
                console.error(`Error subiendo ${productName}:`, err);
            } else {
                console.log(`Subido: ${productName}`);
            }
        }
    }
    console.log('Carga completada.');
}

uploadCatalog();
