const supabaseUrl = 'https://hgjcmsqforkvcfatygsl.supabase.co';
const supabaseKey = 'sb_publishable_Ij2NSppTJRCxCpLzOOtLNA_OZY1RKZS';

async function testQuery() {
    const response = await fetch(`${supabaseUrl}/rest/v1/products?category=ilike.%oversize%`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    console.log("Count for category OVERSIZE:", data.length);
    if(data.length > 0) {
        console.log("First item:", data[0]);
    }
}
testQuery();

