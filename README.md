# RateMyProfessors extention for Berkeleytime
This extension enhances the Berkeleytime course catalog by adding RateMyProfessors statistics directly to the catalog page.
The extention can be found here: https://chromewebstore.google.com/detail/better-berkeleytime/declfjbohkamclnjbpjhcfpgmmceloam

## Set Up
Works as is.
    
## How It Works
- Page Load Detection: When the user navigates to the Berkeleytime catalog page, the background script detects this and sends a message to the content script.
- Table Modification: The content script looks for the course table on the page. When found, it begins modifying the table, focusing on the instructor name cells.
- Instructor Name Processing: For each instructor name, the script initiates the fetching process.
- RMP Data Fetching (This is the core of the RMP functionality): 
  a. The content script sends a message to the background script requesting RMP data for a specific instructor.
  b. The background script constructs a GraphQL query to the RMP API. 
  c. It sends a POST request to the RMP GraphQL endpoint with:
      Appropriate headers (including authorization and cookies)
      A payload containing the GraphQL query and variables (including the instructor's name) 
  d. The RMP server processes the request and sends back the response. 
  e. The background script receives the response and sends it back to the content script.
- Data Processing: The content script receives the RMP data and extracts relevant information like average rating, number of ratings, difficulty, etc. This processed data is stored in a cache to avoid redundant API calls.
- UI Update: The script creates a new UI element for each instructor, displaying their RMP information. The background color of the element is set based on the rating. The script adds click listeners to the instructor elements. When clicked, it opens the corresponding RMP page for that instructor in a new tab.
- Continuous Monitoring: The script continues to observe the page for any changes (like pagination or filtering).
- Performance Optimization: The script uses caching to store fetched RMP data, reducing the number of API calls. It also implements retry & timeout logic for table modification in case the table is not immediately available.

## Chronic Issues
- API Dependency: The extension relies heavily on RMP's GraphQL API. Any changes to this API could break the extension's functionality.
- Data Extraction Robustness: The methods employed for data extraction from both Berkeleytime and RateMyProfessors are fragile. Updates to these websites would likely break the extention as well.
- Caching Limitations: The current caching mechanism (using an array) is not persistent across page reloads or browser sessions.
