/**
 * Test script to check if models API is working
 * Run with: node test-models-api.js
 */

const providers = ['OpenAI', 'Claude', 'DeepSeek', 'Qwen'];

async function testModelsAPI() {
  console.log('Testing Models API...\n');

  for (const provider of providers) {
    try {
      console.log(`\n━━━ Testing ${provider} ━━━`);
      const response = await fetch(`http://localhost:3000/api/models?provider=${provider}`);
      const data = await response.json();

      if (data.success) {
        console.log(`✓ Success! Found ${data.count} models`);
        if (data.fallback) {
          console.log(`⚠ Using fallback (static registry)`);
          if (data.error) {
            console.log(`  Error: ${data.error}`);
          }
        } else {
          console.log(`✓ Fetched from API dynamically`);
        }

        console.log('\nAvailable models:');
        data.models.forEach(model => {
          console.log(`  - ${model.name} (${model.id})`);
          console.log(`    $${model.inputPrice.toFixed(2)}/$${model.outputPrice.toFixed(2)} per 1M tokens`);
        });
      } else {
        console.log(`✗ Failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`✗ Error: ${error.message}`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Testing complete!');
}

testModelsAPI();
