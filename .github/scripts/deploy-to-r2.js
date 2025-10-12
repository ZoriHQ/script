#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration from environment variables
const config = {
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  apiToken: process.env.CLOUDFLARE_API_TOKEN,
  bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME,
  customDomain: process.env.CLOUDFLARE_R2_CUSTOM_DOMAIN,
  version: process.env.VERSION
};

// Validate required environment variables
const requiredVars = ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_R2_BUCKET_NAME', 'VERSION'];
for (const varName of requiredVars) {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`);
    process.exit(1);
  }
}

console.log(`🚀 Deploying version ${config.version} to Cloudflare R2...`);

async function uploadFile(filePath, r2Path, cacheControl) {
  const fileContent = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  
  console.log(`📤 Uploading ${fileName} to ${r2Path}...`);
  
  // Using curl to upload to R2 via Cloudflare API
  const curlCommand = `curl -X PUT "https://api.cloudflare.com/client/v4/accounts/${config.accountId}/r2/buckets/${config.bucketName}/objects/${r2Path}" \\
    -H "Authorization: Bearer ${config.apiToken}" \\
    -H "Content-Type: application/javascript" \\
    -H "Cache-Control: ${cacheControl}" \\
    -H "Access-Control-Allow-Origin: *" \\
    --data-binary @${filePath}`;

  try {
    const result = execSync(curlCommand, { encoding: 'utf8' });
    console.log(`✅ Successfully uploaded ${fileName} to ${r2Path}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to upload ${fileName}:`, error.message);
    return false;
  }
}

async function deployToR2() {
  const scriptFile = 'script.min.js';
  
  if (!fs.existsSync(scriptFile)) {
    console.error(`❌ File ${scriptFile} not found`);
    process.exit(1);
  }

  const uploads = [
    // Versioned URL (immutable, long cache)
    {
      path: `v${config.version}/script.min.js`,
      cache: 'public, max-age=31536000, immutable'
    },
    // Latest URL (short cache for updates)
    {
      path: 'latest/script.min.js',
      cache: 'public, max-age=300'
    },
    // Root URL (medium cache)
    {
      path: 'script.min.js',
      cache: 'public, max-age=3600'
    }
  ];

  let successCount = 0;
  
  for (const upload of uploads) {
    const success = await uploadFile(scriptFile, upload.path, upload.cache);
    if (success) successCount++;
  }

  if (successCount === uploads.length) {
    console.log(`\n🎉 Successfully deployed to all endpoints!`);
    console.log(`📍 Versioned: https://${config.customDomain}/v${config.version}/script.min.js`);
    console.log(`📍 Latest: https://${config.customDomain}/latest/script.min.js`);
    console.log(`📍 Root: https://${config.customDomain}/script.min.js`);
  } else {
    console.error(`\n❌ Deployment partially failed. ${successCount}/${uploads.length} uploads succeeded.`);
    process.exit(1);
  }
}

// Run deployment
deployToR2().catch(error => {
  console.error('❌ Deployment failed:', error);
  process.exit(1);
});