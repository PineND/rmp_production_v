cache = []

function handle_background_color(rating, numRatings) {
  if (rating === undefined) {return '#DDDDDD'}
  if (numRatings === 0) {return '#B7B7B7'}
  if (rating < 1) {return '#FF7676'} 
  if (rating < 2) {return '#FF9B57'}
  if (rating < 3) {return '#FFD366'}
  if (rating < 4) {return '#C4DD68'}
  return '#4FC688'
}

function handle_professor_info_display(result) {
  const result_name = result[0]
  const result_data = result[1]
  const info_box = document.createElement('div')
  info_box.className = 'professor-info'
  const background_color = handle_background_color(result_data.avgRating, result_data.numRatings)
  info_box.style.backgroundColor = background_color

  // Create the initial display name with rating
  let displayName = result_name
  if (!result_data.error && result_data.avgRating !== undefined) {
    const formattedRating = parseFloat(result_data.avgRating).toFixed(1)
    displayName += `<br>Rating: ${formattedRating}`
  }

  // Use innerHTML for the professor name
  info_box.innerHTML = `<div class="professor-name">${displayName}</div>`

  const expanded_details = document.createElement('div')
  expanded_details.className = 'professor-details'
  expanded_details.style.backgroundColor = background_color

  if (result_data.error) {
    expanded_details.textContent = 'No data available'
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

  const matchingProfs = nodes.filter(
    node => {
      const lastNameMatch = node.lastName.toUpperCase() === lastName.toUpperCase()
      const firstInitialMatch = node.firstName[0].toUpperCase() === firstInitial.toUpperCase()
      return lastNameMatch && firstInitialMatch
    }
  )
  if (matchingProfs.length > 0) {
    const selected_match = matchingProfs[0]
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
    cache[search_term] = {error: "No matching professors found"}
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
async function handle_name_text_string(prof_name) {
    let names = prof_name.split(', ')
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
              const professorContent = handle_professor_info_display(result)
              nameCell.appendChild(professorContent)
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
  } else {
    console.log(`Max retries reached`)
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
