$(document).on("click", ".history_link", function (e) {
    let crawl_id = $(this).attr("id");
    $.ajax({
        url: "https://lacerta-2021.uc.r.appspot.com/crawls/" + crawl_id,
        dataType: "json",
        success: function(output) {
            document.getElementById("start_url").value=output["url"];
            if (output["type"] === "BFS") {
                $("#search_type").replaceWith(
                    "<div class='btn-group d-flex btn-group-toggle' id='search_type' data-toggle='buttons' role='radiogroup' aria-label='Search Type'><label class='btn bfs w-100 active'><input type='radio' name='search_type' id='search_type1' value='BFS' autocomplete='off' onchange='return depthMenu(this)' checked> Breadth-First </label><label class='btn dfs w-100'><input type='radio' name='search_type' id='search_type2' value='DFS' autocomplete='off' onchange='return depthMenu(this)'> Depth-First</label></div>"
                );
            } else {
                $("#search_type").replaceWith(
                    "<div class='btn-group d-flex btn-group-toggle' id='search_type' data-toggle='buttons' role='radiogroup' aria-label='Search Type'><label class='btn bfs w-100'><input type='radio' name='search_type' id='search_type1' value='BFS' autocomplete='off' onchange='return depthMenu(this)'> Breadth-First </label><label class='btn dfs w-100 active'><input type='radio' name='search_type' id='search_type2' value='DFS' autocomplete='off' onchange='return depthMenu(this)' checked> Depth-First</label></div>"
                );
            }
            fixDepthMenu(output["type"]);
            document.getElementById("depth").value=output["depth"];
            document.getElementById("keyword").value=output["keyword"];
        }
    });
});

$(document).on("click", "#clear_history", function (e) {
    clearHistory();
});

// change depth menu drop down values
function fixDepthMenu(searchType){
	const a = ['1','2','3'];
	const b = ['1','2','3','4','5','6','7','8','9','10', '11','12','13','14','15','16','17','18','19','20'];
	let s = document.getElementById('depth');
	for(var i = s.options.length-1; i >= 0 ; i--) { s.options[i] = null; }
	if(searchType !== 0){
		let z;
		switch (searchType) {
			case 'BFS' : z = a; break;
			case 'DFS' : z = b; break;
			default : alert('Error: Invalid search type'); break;
		}
		for(i = 0; i < z.length; i++ ) {
		  s.options[i] = new Option(z[i],z[i],false,false);
		}
	}
}

// delete cookies
function clearHistory() {
    document.cookie = "crawl_history=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    $("#container1").load(location.href + " #container1>*", "");
}