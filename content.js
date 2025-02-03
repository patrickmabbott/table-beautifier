
// Wait for page load.
window.onload = () => {
    const tables = document.querySelectorAll('table');
    let autoIncrementId = 0;
    tables.forEach(table => {
        
        if (table.querySelector('tr') && table.querySelector('td')) {

            // Ideally, a table will have separate thead and tbody sections. If not, we'll just assume the first row is the header.
            const header = table.querySelector('thead');

            let headerFields = [];
            let skipFirstRow = false;
            // Preferably, we would always look for 'th'. However, some tables might use 'td' and some might even use a mix of both.
            const selectorGroup = 'th, td';
            if (!header) {
                // Leave out columns with empty headers. They are likely just meant for spacing.
                headerFields = [...table.querySelector('tr').querySelectorAll(selectorGroup)].map(td => td.innerText).filter(header => header);
                skipFirstRow = true;
            } else {
                // Leave out columns with empty headers. They are likely just meant for spacing.
                headerFields = [...header.querySelectorAll(selectorGroup)].map(th => th.innerText).filter(header => header);
            }

            const body = table.querySelector('tbody');
            const rows = [...body.querySelectorAll('tr')];
            let jsonData = null;
            try {
                jsonData = rows
                    // Skip the first row if we've already processed it as the header.
                    .filter((_, idx) => skipFirstRow ? idx !== 0 : true)
                    .map( (row) => {
                        const cells = [...row.querySelectorAll('td')];
                        return cells // Skip cells that are empty or undefined.
                            .filter( entry => entry.innerText)
                            .reduce((prev, cell, idx) => {
                                const value = cell.innerText;
                                const associatedHeader = headerFields[idx];
                                // If we can't find an associated header, that's a strong sign that the table isn't reasonably transformable and we should abandon.
                                if (!associatedHeader) {
                                    throw new Error(`Table is not transformable. Could not find associated header. ${cell} ${idx} ${value} ${headerFields}`);
                                }
                                return {
                                    ...prev,
                                    [associatedHeader]: value,
                                }
                            }, {});
                });
            } catch(e) {
                console.error(`Table is not transformable. Error: ${e}`);
                return;
            }

            // Check if we were able to produce a sensible JSON object from the table.
            // If not, abandon.
            let newTable = null;
            // Save the parent of the table so we can insert new components.
            const tableParent = table.parentNode;
            const replaceTable = (table) => {
                // Save the style of the table so we can apply it to the ag-grid component, mostly so as to get width, height, layout positioning etc...
                const originalStyle = table.style;
    
                // Now, add an ag-grid component in its place (The script should already have been downloaded as part of this extension embedding it in the page).
    
                const columnDefs = headerFields.map(header => {
                    return {
                        headerName: header,
                        field: header,
                    };
                });
    
                const gridOptions = {
                    rowData: jsonData,
                    columnDefs: columnDefs,
                    defaultColDef: {
                        editable: true,
                        sortable: true,
                        filter: true,
                        resizable: true,
                    },
                    animateRows: true,
                    domLayout: "autoHeight",
                    onGridReady: (params) => {
                        params.api.sizeColumnsToFit();
                    },
                };
                newTable = document.createElement("div");
                // If the original element had an ID, us that. Otherwise, auto-increment.
                newTable.id = table.id || `ag-grid-${autoIncrementId++}`;
                // Prefer the grid's own style, when available.
                newTable.style = {
                    ...originalStyle,
                    ...newTable.style
                }
    
                tableParent.insertBefore(newTable, table);
                // Remove the table so we can replace it.
                table.remove();
    
                // tableParent.appendChild(gridDiv);
                agGrid.createGrid(newTable, gridOptions);
            }
            const exportCSV = () => {
                const jsonToCsv = (jsonArray) => {
                    if (!jsonArray.length) {
                        return [];
                    }
                    // This operates under the assumption that all json objects have the same keys.
                    const keys = Object.keys(jsonArray[0]);
                    const header = keys.join(',');
                    const rows = jsonArray.map(obj => {
                        return keys.map(key => obj[key]).join(',');
                    });
                    return [header, ...rows];
                };
                const csvData = jsonToCsv(jsonData);
                const csvString = csvData.join('\n');
                const blob = new Blob([csvString], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'table.csv';
                a.click();
                URL.revokeObjectURL(url);
            }

            const exportButton = document.createElement("button");
            exportButton.innerText = "Export to CSV";
            // Now, go ahead and add an export button.
            tableParent.insertBefore(exportButton, table);
            exportButton.onclick = exportCSV;

            // Now, add the beautify button.
            const beautifyButton = document.createElement("button");
            beautifyButton.innerText = "Beautify";
            tableParent.insertBefore(beautifyButton, table);
            beautifyButton.onclick = () => {
                replaceTable(table);
                // After replacing the table, remove the beautify button itself.
                beautifyButton.remove();
            }
        }
    });
};
