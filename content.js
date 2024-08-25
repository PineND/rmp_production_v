cache = []

function handle_background_color(rating, numRatings) {
  if (rating === undefined || numRatings === 0) {return '#DDDDDD'}
  if (rating < 1.25) {return '#FF6969'} 
  if (rating < 2.5) {return '#FFAB24'}
  if (rating < 3.75) {return '#B4DD07'}
  return '#00BA00'
}

function handle_instructor_info_display(result) {
  const result_name = result[0]
  const result_data = result[1]
  const info_box = document.createElement('div')
  info_box.className = 'instructor-info'
  const background_color = handle_background_color(result_data.avgRating, result_data.numRatings)
  info_box.style.backgroundColor = background_color

  info_box.innerHTML = `<div class="instructor-name">${result_name}</div>`

  const expanded_details = document.createElement('div')
  expanded_details.className = 'instructor-details'
  expanded_details.style.backgroundColor = background_color

  if (result_data.numRatings === 0) {
    expanded_details.textContent = 'No data available'
  } else if (result_data.error) {
    expanded_details.textContent = 'Instructor is not on RMP'
  } else {
    expanded_details.innerHTML = `
      <div class="spacer"></div>
      ${result_data.department}
      <div class="spacer"></div>
      Rating: ${result_data.avgRating}<br>
      Difficulty: ${result_data.avgDifficulty}<br>
      ${result_data.numRatings} ratings
      <div class="spacer"></div>
    `
  }
  info_box.appendChild(expanded_details)
  info_box.addEventListener('click', (event) => {
    event.stopPropagation()
    if (result_data.legacyId === undefined) {
      const school_id = 1072
      const url = `https://www.ratemyprofessors.com/search/professors/${school_id}/?q=${encodeURIComponent(result_name)}`
      window.open(url, '_blank')
    }
    else {
      const url = `https://www.ratemyprofessors.com/professor/${result_data.legacyId}`
      window.open(url, '_blank')
    }
  })
  return info_box
}

function handle_disgested_rmp_response(search_term) {
  return [search_term, cache[search_term]]
}

// gets called for every name instance
function handle_raw_rmp_response(response_data, search_term) {
  cache[search_term] = {}
  if (
    !response_data.data || 
    !response_data.data.search || 
    !response_data.data.search.teachers || 
    !response_data.data.search.teachers.edges
  ) {
    cache[search_term] = {error: "Edge finding error"}
  }
  const edges = response_data.data.search.teachers.edges
  if (edges.length === 0) {
    cache[search_term] = {error: "No RMP results"}
  }
  const nodes = edges.map(edge => edge.node)
  const [lastName, firstInitial] = search_term.split(' ')

  const matching_instructors = nodes.filter(
    node => {
      const lastNameMatch = node.lastName.toUpperCase() === lastName.toUpperCase()
      const firstInitialMatch = node.firstName[0].toUpperCase() === firstInitial.toUpperCase()
      return lastNameMatch && firstInitialMatch
    }
  )
  if (matching_instructors.length > 0) {
    const selected_match = matching_instructors[0]
    cache[search_term] = {
      firstName: selected_match.firstName,
      lastName: selected_match.lastName,
      id: selected_match.id,
      legacyId: selected_match.legacyId,
      department: selected_match.department,
      avgRating: selected_match.avgRating,
      avgDifficulty: selected_match.avgDifficulty,
      numRatings: selected_match.numRatings,
      takeAgain: selected_match.wouldTakeAgainPercent
    }
  }
  else {
    cache[search_term] = {error: "No matching instructors found"}
  }
  return handle_disgested_rmp_response(search_term)
}

// gets called for every name instance
function fetch_rmp_data(search_term) {
  return new Promise((resolve, reject) => {
    if (cache[search_term]) {
      resolve(handle_disgested_rmp_response(search_term));
    } else {
      chrome.runtime.sendMessage(
        {action: "fetchRMP", name: search_term},
        function(response) {
          if (response.data) {
            resolve(handle_raw_rmp_response(response.data, search_term));
          } else if (response.error) {
            console.error('Error:', response.error);
            reject(response.error);
          }
        }
      )
    }
  })
}

// gets called for every name instance
async function handle_name_text_string(instructor_name) {
    let names = instructor_name.split(', ')
    let results = await Promise.all(names.map(name => fetch_rmp_data(name)))
    return results
}

// gets called every time table is updated
async function table_modifier(table_body) {
  const rows = table_body.querySelectorAll('tr')
  for (const row of rows) {
    const cells = row.querySelectorAll('td')
    if (cells.length >= 3) {
      const nameCell = cells[2]
      // Check if the cell has already been modified
      if (!nameCell.hasAttribute('data-rmp-modified')) {
        const nameText = nameCell.textContent.trim()
        if (nameText !== "") {
          try {
            const result = await handle_name_text_string(nameText)
            nameCell.innerHTML = ''
            result.forEach((result) => {
              const instructor_content = handle_instructor_info_display(result)
              nameCell.appendChild(instructor_content)
            })
            nameCell.setAttribute('data-rmp-modified', 'true')
          } catch (error) {
            console.error('Error processing name:', nameText, error)
          }
        }
      }
    }
  }
}

function retryOperation(operation, retries, maxRetries, refresh_interval) {
  if (retries < maxRetries) {
    setTimeout(() => operation(retries + 1, maxRetries, refresh_interval), refresh_interval)
  }
}

async function modifyLiveTable(retries = 0, maxRetries = 100, refresh_interval = 100) {
  const tbody_dir = "#root > div > div > div._root_szin5_37 > section > div > table > tbody"
  const table_body = document.querySelector(tbody_dir)
  if (table_body) {
    await table_modifier(table_body)
    const observer = new MutationObserver(async (mutations) => {
      for (let mutation of mutations) {
        if (mutation.type === 'childList') {
          for (let node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE && (node.tagName === 'TR' || node.querySelector('tr'))) {
              await table_modifier(table_body)
              break
            }
          }
        }
      }
    })
    observer.observe(table_body, { childList: true, subtree: true })
  } else {
    retryOperation(modifyLiveTable, retries, maxRetries, refresh_interval)
  }
}


const catalog_url = "https://berkeleytime.com/catalog"

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkUrl" && window.location.href.includes(catalog_url)) {
    modifyLiveTable().catch(console.error)
  }
})

if (window.location.href.includes(catalog_url)) {
  modifyLiveTable().catch(console.error)
}
