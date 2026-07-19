import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://hgjcmsqforkvcfatygsl.supabase.co';
const supabaseKey = 'sb_publishable_Ij2NSppTJRCxCpLzOOtLNA_OZY1RKZS';

const catalogoDir = path.join(process.cwd(), 'assets', 'catalogo');

async function supabaseRequest(endpoint, options) {
    const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
        ...options,
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
            ...options.headers
        }
    });
    if (!response.ok) {
        const err = await response.text();
        throw new Error(`HTTP Error: ${response.status} - ${err}`);
    }
    return response;
}

async function uploadCatalog() {
    console.log('Borrando artículos previos de COLECCIONES...');
    try {
        await supabaseRequest(`products?category=eq.COLECCIONES`, { method: 'DELETE' });
        console.log('Artículos previos borrados.');
    } catch (e) {
        console.error('Error borrando artículos', e);
    }

    console.log('Iniciando carga del catálogo multi-imagen...');
    const folders = fs.readdirSync(catalogoDir).filter(f => fs.statSync(path.join(catalogoDir, f)).isDirectory());

    for (const folder of folders) {
        const folderPath = path.join(catalogoDir, folder);
        const files = fs.readdirSync(folderPath).filter(f => f.match(/\.(jpg|jpeg|png|webp|gif)$/i));
        
        // Ordenar alfabéticamente para que -01 quede de principal
        files.sort();

        if (files.length === 0) continue;

        const productName = `Diseño ${folder}`;
        // Unir las rutas separadas por comas
        const imagePaths = files.map(file => `assets/catalogo/${folder}/${file}`).join(',');

        const product = {
            name: productName,
            price: 1500, // Precio base
            category: 'COLECCIONES',
            description: `Prenda personalizada con diseño de ${folder}. Este diseño forma parte de nuestro catálogo digital exclusivo.`,
            image: imagePaths, // Ahora guarda múltiples imágenes
            sizes: ['S', 'M', 'L', 'XL']
        };

        try {
            await supabaseRequest(`products`, { method: 'POST', body: JSON.stringify(product) });
            console.log(`Subido: ${productName} con ${files.length} imágenes.`);
        } catch(err) {
            console.error(`Error subiendo ${productName}:`, err.message);
        }
    }
    console.log('Carga multi-imagen completada.');
}

uploadCatalog();
