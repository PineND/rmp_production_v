chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.url.includes('berkeleytime.com/catalog')) {
    chrome.tabs.sendMessage(details.tabId, {action: "checkUrl"});
  }
});

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.action === "fetchRMP") {
      const name = request.name
      const url = 'https://www.ratemyprofessors.com/graphql';
      const headers = {
        'Content-Type': 'application/json',
        'Origin': 'https://www.ratemyprofessors.com',
        'Referer': `https://www.ratemyprofessors.com/search/professors/1072?q=${name}`,
        'Authorization': 'Basic dGVzdDp0ZXN0',
        'Cookie': 'userSchoolId=U2Nob29sLTEwNzI=; userSchoolLegacyId=1072; userSchoolName=University%20of%20California%20Berkeley'
      }
      const payload = {
        "query":"query TeacherSearchResultsPageQuery(\n  $query: TeacherSearchQuery!\n  $schoolID: ID\n  $includeSchoolFilter: Boolean!\n) {\n  search: newSearch {\n    ...TeacherSearchPagination_search_1ZLmLD\n  }\n  school: node(id: $schoolID) @include(if: $includeSchoolFilter) {\n    __typename\n    ... on School {\n      name\n    }\n    id\n  }\n}\n\nfragment TeacherSearchPagination_search_1ZLmLD on newSearch {\n  teachers(query: $query, first: 8, after: \"\") {\n    didFallback\n    edges {\n      cursor\n      node {\n        ...TeacherCard_teacher\n        id\n        __typename\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    resultCount\n    filters {\n      field\n      options {\n        value\n        id\n      }\n    }\n  }\n}\n\nfragment TeacherCard_teacher on Teacher {\n  id\n  legacyId\n  avgRating\n  numRatings\n  ...CardFeedback_teacher\n  ...CardSchool_teacher\n  ...CardName_teacher\n  ...TeacherBookmark_teacher\n}\n\nfragment CardFeedback_teacher on Teacher {\n  wouldTakeAgainPercent\n  avgDifficulty\n}\n\nfragment CardSchool_teacher on Teacher {\n  department\n  school {\n    name\n    id\n  }\n}\n\nfragment CardName_teacher on Teacher {\n  firstName\n  lastName\n}\n\nfragment TeacherBookmark_teacher on Teacher {\n  id\n  isSaved\n}\n","variables":
        {"query":{"text":`${name}`,"schoolID":"U2Nob29sLTEwNzI=","fallback":true},"schoolID":"U2Nob29sLTEwNzI=","includeSchoolFilter":true}
      }
      

      fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        sendResponse({data: data});
      })
      .catch(error => {
        sendResponse({error: error.message});
      });

      return true;  // Will respond asynchronously.
    }
  }
);