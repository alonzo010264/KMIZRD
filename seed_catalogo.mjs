import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://hgjcmsqforkvcfatygsl.supabase.co';
const supabaseKey = 'sb_publishable_Ij2NSppTJRCxCpLzOOtLNA_OZY1RKZS';

const catalogoDir = path.join(process.cwd(), 'assets', 'catalogo');

// Carpetas a EXCLUIR del catálogo (artículos que no son diseños de ropa)
const EXCLUDE_FOLDERS = ['Articulos personalizados'];

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

    console.log('Iniciando carga del catálogo por PARES (frente + espalda)...');
    const folders = fs.readdirSync(catalogoDir)
        .filter(f => fs.statSync(path.join(catalogoDir, f)).isDirectory())
        .filter(f => !EXCLUDE_FOLDERS.includes(f)); // Excluir carpetas no deseadas

    for (const folder of folders) {
        const folderPath = path.join(catalogoDir, folder);
        const files = fs.readdirSync(folderPath)
            .filter(f => f.match(/\.(jpg|jpeg|png|webp|gif)$/i))
            .sort(); // Ordenar: 01, 02, 03, 04...

        if (files.length === 0) continue;

        // Agrupar en pares: [01,02], [03,04], [05,06]...
        // Si hay número impar, el último va solo.
        const pairs = [];
        for (let i = 0; i < files.length; i += 2) {
            const pair = [files[i]];
            if (files[i + 1]) pair.push(files[i + 1]);
            pairs.push(pair);
        }

        let designNumber = 1;
        for (const pair of pairs) {
            const imagePaths = pair.map(file => `assets/catalogo/${folder}/${file}`).join(',');
            // Si solo hay un par en total, usar "Diseño Zoro" sin número
            const productName = pairs.length === 1 
                ? `Diseño ${folder}` 
                : `Diseño ${folder} ${designNumber}`;

            const product = {
                name: productName,
                price: 1500, // Precio base editable desde admin
                category: 'COLECCIONES',
                description: `Prenda personalizada con diseño de ${folder}. Muestra el frente y la espalda del artículo.`,
                image: imagePaths, // "frente.jpg,espalda.jpg"
                sizes: ['S', 'M', 'L', 'XL']
            };

            try {
                await supabaseRequest(`products`, { method: 'POST', body: JSON.stringify(product) });
                console.log(`✅ Subido: ${productName} (${pair.length} imagen${pair.length > 1 ? 'es' : ''})`);
            } catch(err) {
                console.error(`❌ Error subiendo ${productName}:`, err.message);
            }

            designNumber++;
        }
    }
    console.log('\nCarga completada correctamente.');
}

uploadCatalog();
