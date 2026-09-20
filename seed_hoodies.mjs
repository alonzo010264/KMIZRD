
const supabaseUrl = 'https://hgjcmsqforkvcfatygsl.supabase.co';
const supabaseKey = 'sb_publishable_Ij2NSppTJRCxCpLzOOtLNA_OZY1RKZS';

async function supabaseRequest(endpoint, options = {}) {
    const url = `${supabaseUrl}/rest/v1/${endpoint}`;
    const headers = {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Supabase Error: ${response.status} - ${err}`);
    }
    return response.json();
}

async function seedHoodies() {
    const hoodies = [
        {
            name: "Abrigo Bob Esponja y Patricio",
            price: 1800,
            category: "HOODIES",
            description: "Abrigo exclusivo de Bob Esponja y Patricio. Diseño cómodo y tela premium de alta calidad. ¡Añádelo a tu carrito y pide ahora!",
            image: "assets/hoodies/hoodie-bob-patricio.png",
            sizes: ["S", "M", "L", "XL"]
        },
        {
            name: "Abrigo Rick y Morty",
            price: 1800,
            category: "HOODIES",
            description: "Abrigo exclusivo de Rick y Morty. Diseño cómodo y tela premium de alta calidad. ¡Añádelo a tu carrito y pide ahora!",
            image: "assets/hoodies/hoodie-rick-morty.png",
            sizes: ["S", "M", "L", "XL"]
        },
        {
            name: "Abrigos Pareja Tic Tac Toe (Par)",
            price: 3600,
            category: "HOODIES",
            description: "Set de 2 abrigos para parejas (Tic Tac Toe Love). Diseño cómodo y tela premium de alta calidad. ¡Añádelos a tu carrito y pide ahora!",
            image: "assets/hoodies/hoodie-couple.png",
            sizes: ["S", "M", "L", "XL"]
        },
        {
            name: "Abrigo NTG",
            price: 1800,
            category: "HOODIES",
            description: "Abrigo exclusivo NTG (New Trend Gaming). Diseño urbano y tela premium de alta calidad. ¡Añádelo a tu carrito y pide ahora!",
            image: "assets/hoodies/hoodie-ntg.png",
            sizes: ["S", "M", "L", "XL"]
        },
        {
            name: "Abrigo Bad Bunny Un Verano Sin Ti",
            price: 1800,
            category: "HOODIES",
            description: "Abrigo exclusivo de Bad Bunny. Diseño cómodo y tela premium de alta calidad. ¡Añádelo a tu carrito y pide ahora!",
            image: "assets/hoodies/hoodie-bad-bunny.png",
            sizes: ["S", "M", "L", "XL"]
        }
    ];

    for (let product of hoodies) {
        try {
            await supabaseRequest(`products`, { method: 'POST', body: JSON.stringify(product) });
            console.log(`✅ Subido: ${product.name} (${product.image})`);
        } catch(e) {
            console.error(`❌ Error con ${product.name}:`, e.message);
        }
    }
}

seedHoodies();
