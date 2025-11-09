# Qwen/Alibaba Cloud Model Studio Setup Guide

This guide explains how to set up Qwen API for the Cortex.

## ✅ What Was Fixed

The original code was hardcoded to use the **China (Beijing)** region URL, but most international users get API keys from the **International (Singapore)** region. This caused 401 authentication errors.

**The fix:** The code now supports both regions and defaults to International.

## 🔑 Step 1: Activate Model Studio & Get API Key

### 1.1 Activate the Service

Visit **Alibaba Cloud Model Studio**:
- **International (Singapore)**: https://www.alibabacloud.com/solutions/generative-ai/qwen
- **China (Beijing)**: https://dashscope.console.aliyun.com/

**Sign in** and activate Model Studio if prompted. Activation is free.

### 1.2 Create an API Key

1. Go to **API Key Management**:
   - **Singapore**: https://bailian.console.alibabacloud.com/#/api-key (International)
   - **Beijing**: https://dashscope.console.aliyun.com/api-key (China)

2. Click **"Create API Key"**

3. Configure:
   - **Owner Account**: Select your account or RAM user
   - **Workspace**: Select "Default Workspace" (or create a sub-workspace)
   - **Description**: e.g., "Crypto Trading Bot"

4. Click **OK** and copy the generated key

5. **Important**: The key format should be `sk-xxxxxxxxxxxxxxxxxxxxxxxxxx`

## 🌏 Step 2: Configure Region in .env

Add to your `.env` file:

```bash
# Qwen API Configuration
QWEN_API_KEY=sk-your-actual-key-here
QWEN_REGION=international  # Use 'international' for Singapore or 'china' for Beijing
```

**Region Options:**
- `international` → Singapore region (DEFAULT)
- `china` or `beijing` → China region

**Base URLs Used:**
- International: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
- China: `https://dashscope.aliyuncs.com/compatible-mode/v1`

## 🧪 Step 3: Test Your API Key

Run the test script:

```bash
node test-qwen-key.js
```

**Expected output:**
```
Testing Qwen API key...
API Key: sk-7f3d597...

🌏 Testing International (Singapore) region...
✅ SUCCESS! API key is valid.
Response: test successful
```

**If you see 401 error:**
- Verify you created the key in the correct region
- Check if your key is copied correctly (no spaces)
- Ensure QWEN_REGION matches where you created the key

## 💰 Pricing & Free Quota

**New Users Get:**
- Free quota when activating Model Studio
- Varies by region and promotion

**Pricing (as of 2024):**
- **qwen-plus**: ~$0.001 per 1K tokens
- **qwen-turbo**: ~$0.0002 per 1K tokens

Check current pricing:
- International: https://www.alibabacloud.com/help/en/model-studio/pricing
- China: https://help.aliyun.com/zh/model-studio/pricing-overview

## 🔒 Security Best Practices

1. **Never commit** `.env` to version control
2. **Use RAM users** for team access (not root account)
3. **Create sub-workspaces** to separate costs/permissions
4. **Monitor usage** in the Model Studio console
5. **Set spending alerts** in Alibaba Cloud console

## 🚀 Using in Production

When deploying to Synology NAS or Docker:

**Option 1: Environment Variables**
```bash
docker run -e QWEN_API_KEY=sk-xxx -e QWEN_REGION=international ...
```

**Option 2: Docker Compose**
The `docker-compose.yml` already includes:
```yaml
environment:
  - QWEN_API_KEY=${QWEN_API_KEY}
  - QWEN_REGION=${QWEN_REGION:-international}
```

## ❓ FAQ

**Q: Can I use both regions?**
A: No, you need separate API keys for each region. Set QWEN_REGION to match where you created the key.

**Q: Which region should I choose?**
A: Use **International (Singapore)** unless you're in mainland China or specifically need China region.

**Q: How do I check my quota?**
A: Go to Model Studio console → Billing/Usage section

**Q: Can I change regions later?**
A: Yes, just create a new key in the other region and update your `.env` file.

**Q: Do I need to enable billing?**
A: Yes, but new users get free quota. You're only charged for usage beyond the free tier.

## 🆘 Troubleshooting

### Error: "Incorrect API key provided"
- ✅ Verify region matches (check QWEN_REGION)
- ✅ Copy key again (avoid extra spaces)
- ✅ Ensure key is activated in console

### Error: "Insufficient quota"
- ✅ Check your billing in Model Studio
- ✅ Add credits to your Alibaba Cloud account
- ✅ Verify free quota hasn't expired

### Error: "Model not found"
- ✅ Check if you have access to `qwen-plus` model
- ✅ Try `qwen-turbo` instead (edit `lib/llm/qwen.ts`)

## 📚 Additional Resources

- **Model Studio Docs**: https://www.alibabacloud.com/help/en/model-studio
- **API Reference**: https://help.aliyun.com/zh/model-studio/developer-reference/api-reference
- **Qwen Models**: https://qwen.readthedocs.io/

---

**Ready to trade!** Once your key is validated, Qwen will participate in the trading competition alongside OpenAI, Claude, and DeepSeek. 🚀
