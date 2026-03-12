"""
Test AI Configuration in skillsMN Electron App
Tests the AI configuration with provided credentials
"""

from playwright.sync_api import sync_playwright
import time

def test_ai_configuration():
    """Test AI configuration with provided credentials"""

    # AI Configuration to test
    ai_config = {
        'base_url': 'https://open.bigmodel.cn/api/anthropic',
        'api_key': 'f8b3db6f0e6c8ed9c7890fe4d3c43be6.6tNmJ4ncX8h3JKdw',
        'model': 'glm-5'
    }

    print("=" * 60)
    print("AI Configuration Test")
    print("=" * 60)
    print(f"Base URL: {ai_config['base_url']}")
    print(f"API Key: {ai_config['api_key'][:20]}...")
    print(f"Model: {ai_config['model']}")
    print("=" * 60)

    with sync_playwright() as p:
        # Launch Electron app
        print("\n[1/7] Launching Electron app...")
        try:
            electron_app = p.chromium.launch(
                executable_path=r"D:\skillsMN\node_modules\electron\dist\electron.exe",
                args=["."],
                headless=False
            )

            # Get the first page (main window)
            context = electron_app.contexts[0]
            page = context.pages[0] if context.pages else context.new_page()

            # Wait for app to load
            print("[2/7] Waiting for app to initialize...")
            time.sleep(5)
            page.wait_for_load_state('networkidle')

            # Take screenshot of initial state
            print("[3/7] Taking screenshot of initial state...")
            page.screenshot(path='/tmp/ai_test_01_initial.png')

            # Navigate to Settings
            print("[4/7] Navigating to Settings...")
            # Click on Settings icon in sidebar (last icon)
            settings_button = page.locator('button[aria-label="Configure settings"]').first
            if settings_button:
                settings_button.click()
                time.sleep(1)
                page.screenshot(path='/tmp/ai_test_02_settings.png')
                print("   ✓ Settings view opened")
            else:
                print("   ✗ Could not find Settings button")
                # Try alternative selector
                page.locator('text=Settings').click()
                time.sleep(1)

            # Wait for AI configuration section
            print("[5/7] Locating AI configuration fields...")
            page.wait_for_selector('input[placeholder*="Base URL"]', timeout=5000)

            # Fill in AI configuration
            print("[6/7] Filling AI configuration...")

            # Base URL
            base_url_input = page.locator('input[placeholder*="Base URL"]').first
            base_url_input.fill(ai_config['base_url'])
            print(f"   ✓ Base URL filled: {ai_config['base_url']}")

            # API Key
            api_key_input = page.locator('input[placeholder*="API Key"]').first
            api_key_input.fill(ai_config['api_key'])
            print(f"   ✓ API Key filled: {ai_config['api_key'][:20]}...")

            # Model
            model_input = page.locator('input[placeholder*="Model"]').first
            model_input.fill(ai_config['model'])
            print(f"   ✓ Model filled: {ai_config['model']}")

            time.sleep(1)
            page.screenshot(path='/tmp/ai_test_03_filled.png')

            # Test connection
            print("[7/7] Testing AI connection...")
            test_button = page.locator('button:has-text("Test")').first
            if test_button:
                test_button.click()
                print("   ✓ Test button clicked")

                # Wait for test result
                time.sleep(5)

                # Take screenshot of result
                page.screenshot(path='/tmp/ai_test_04_result.png')

                # Check for success or error message
                success_message = page.locator('text=/success|connected|valid/i').count()
                error_message = page.locator('text=/error|failed|invalid/i').count()

                if success_message > 0:
                    print("   ✅ AI Connection Test: SUCCESS")
                elif error_message > 0:
                    print("   ❌ AI Connection Test: FAILED")
                    # Get error details
                    error_text = page.locator('[class*="error"]').text_content()
                    if error_text:
                        print(f"   Error: {error_text}")
                else:
                    print("   ⚠️  AI Connection Test: Result unclear")
            else:
                print("   ✗ Could not find Test button")

            # Keep app open for manual inspection
            print("\n" + "=" * 60)
            print("Test completed. App will close in 5 seconds...")
            print("Screenshots saved to /tmp/ai_test_*.png")
            print("=" * 60)
            time.sleep(5)

            # Close app
            electron_app.close()

            return True

        except Exception as e:
            print(f"\n❌ Test failed with error: {str(e)}")
            return False

if __name__ == "__main__":
    success = test_ai_configuration()
    exit(0 if success else 1)
