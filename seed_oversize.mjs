import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://hgjcmsqforkvcfatygsl.supabase.co';
const supabaseKey = 'sb_publishable_Ij2NSppTJRCxCpLzOOtLNA_OZY1RKZS';

const oversizeDir = path.join(process.cwd(), 'assets', 'oversize');

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

async function uploadOversize() {
    console.log('Borrando artículos previos de OVERSIZE...');
    try {
        await supabaseRequest(`products?category=eq.OVERSIZE`, { method: 'DELETE' });
        console.log('Artículos previos borrados.');
    } catch (e) {
        console.error('Error borrando artículos', e);
    }

    console.log('Iniciando carga de galería Oversize...');
    const files = fs.readdirSync(oversizeDir)
        .filter(f => f.match(/\.(jpg|jpeg|png|webp|gif)$/i))
        .sort();

    let designNumber = 1;
    for (const file of files) {
        const imagePath = `assets/oversize/${file}`;
        const productName = `Camiseta Oversize ${designNumber}`;

        const product = {
            name: productName,
            price: 1500, // Precio base
            category: 'OVERSIZE',
            description: `Camiseta Oversize exclusiva con diseño único. Tela premium de alta calidad. ¡Añádela a tu carrito y pide ahora!`,
            image: imagePath,
            sizes: ['S', 'M', 'L', 'XL']
        };

        try {
            await supabaseRequest(`products`, { method: 'POST', body: JSON.stringify(product) });
            console.log(`✅ Subido: ${productName} (${file})`);
        } catch(err) {
            console.error(`❌ Error subiendo ${productName}:`, err.message);
        }

        designNumber++;
    }
    console.log('\nCarga completada correctamente.');
}

uploadOversize();
