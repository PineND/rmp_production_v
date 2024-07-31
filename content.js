function createProfLink(unformatted_name) {
  const name = unformatted_name
    .toLowerCase().split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
  const school_id = 1072
  const link = document.createElement('a')
  link.href = `https://www.ratemyprofessors.com/search/professors/${school_id}/?q=${encodeURIComponent(name)}`
  link.textContent = `${unformatted_name}`
  link.target = '_blank'
  return link
}

function table_modifier(table_body) {
  const rows = table_body.querySelectorAll('tr')
  rows.forEach((row) => {
    const cells = row.querySelectorAll('td')
    if (cells.length >= 3) {
      const nameCell = cells[2]
      let nameText = nameCell.textContent.trim()
      nameCell.innerHTML = ''

      if (nameText.includes(',')) {
        let names = nameText.split(',').map(name => name.trim())
        names.forEach((name, index) => {
          nameCell.appendChild(createProfLink(name))
          if (index < names.length - 1) {
            nameCell.appendChild(document.createTextNode(', '))
          }
        })
      } 
      else {nameCell.appendChild(createProfLink(nameText))}
    }
    else {console.log("Name cell not found")}
  })
}

function retryOperation(operation, retries, maxRetries, refresh_interval) {
  if (retries < maxRetries) {
    setTimeout(() => operation(retries + 1, maxRetries, refresh_interval), refresh_interval)
  } else {
    console.log(`Max retries reached`)
  }
}

function modifyLiveTable(retries = 0, maxRetries = 100, refresh_interval = 100) {
  const tbody_dir = "#root > div > div > div._root_szin5_37 > section > div > table > tbody"
  const table_body = document.querySelector(tbody_dir)
  if (table_body) {
    table_modifier(table_body)
  } else {
    retryOperation(modifyLiveTable, retries, maxRetries, refresh_interval)
  }
}

const catalog_url = "https://berkeleytime.com/catalog"

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkUrl" && window.location.href.includes(catalog_url)) {
    modifyLiveTable()
  }
})

if (window.location.href.includes(catalog_url)) {
  modifyLiveTable()
}