/**
 * Created by Andy on 17/11/2016.
 */
var lat,lng,imgBase64;

var db = null;
var indexedDBsupport;
var emailSupport = true;

var posts=[]; //array of posts read from database

$().ready(function(){
    $("#new-image-button").bind("click",function(){
        console.log("Launch image capture");
        var image = $("#new-image-image");
        image.attr("src","gear.gif");
        //picture success set #new-image-image src as picture that was taken
        navigator.camera.getPicture(camSuccess, camFail, { quality: 50,
            destinationType: Camera.DestinationType.DATA_URL
        });
    });
    function camSuccess(imageData) {
        var image = document.getElementById('new-image-image');
        image.src = "data:image/jpeg;base64," + imageData;
        imgBase64 = imageData; //Save global variable accessable by save function
    }
    function camFail(message) {
        alert('Failed because: ' + message);
    }
    $("#new-clear-form-button").bind("click",function(){
        clearInputForm();
    });

    $("#map-tab").bind("click",function(){
        var center = map.getCenter();
        google.maps.event.trigger(map, "resize");
        map.setCenter(center);
    });


    $("#new-save-form-button").bind("click",function(){
        var title = $("#new-title").val();
        var description = $("#new-description").val();
        var gpsEnabled = $("#new-gps-checkbox").is(":checked");
        var species = $("input[name='new-species-input']:checked").val();
        var timeDate = new Date();
        console.log(timeDate);

        if (gpsEnabled){
            //get GPS location
            navigator.geolocation.getCurrentPosition(geoSuccess, geoError,
                {enableHighAccuracy:true, maximumAge:30, timeout:27000});
        } else {
            //set no location
            lat = null;
            lng = null;
            if (validateInputForm(title,description)){
                saveSighting(title,description,species,timeDate,lat,lng);
            }

        }

        //save then clear - clear handled on save success
        function geoSuccess(position){
            lat = (position.coords.latitude);
            lng = (position.coords.longitude);
            if (validateInputForm(title,description)){
                saveSighting(title,description,species,timeDate,lat,lng);
            }
        }

        function geoError(){
            lat = null;
            lng = null;
        }
    });

});

/**
 * @summary Detemines whether or not the input form is valid. P
 * Alerts the user if the input form is not valid.
 * @param title
 * @param description
 * @returns {boolean} valid or not valid
 */
function validateInputForm(title,description){
    var image = $("#new-image-image").attr("src");
    if (image != "img/noimage.jpg" || image != "img/gear.gif"){
        if (title != "" && description != ""){
            return true;
        }
    }
    alert("Please enter a title, description and take a photo!");
    return false;
}

document.addEventListener('deviceready', function() {
    if("indexedDB" in window) {
        console.log("indexedDB supported.");
        indexedDBsupport = true;
    } else {
        console.log("no indexedDB support.");
        indexedDBsupport = false;
    }

    if (indexedDBsupport){
        var openRequest = indexedDB.open("postsDB1",1);

        openRequest.onupgradeneeded = function(e) {
            console.log("running onupgradeneeded");
            var thisDB = e.target.result;

            if(!thisDB.objectStoreNames.contains("posts")) { //posts = photo + details
                thisDB.createObjectStore("posts",{autoIncrement:true});
            }

        };

        openRequest.onsuccess = function(e) {
            console.log("Success!");
            db = e.target.result;

            getPostsList();

        };

        openRequest.onerror = function(e) {
            console.log("Error");
            console.dir(e);
        }
    } else {
        var createTable = "CREATE TABLE IF NOT EXISTS posts2 ("+
            "id INTEGER PRIMARY KEY,"+
            "title TEXT,"+
            "description TEXT," +
            "species TEXT,"+
            "timeDate datetime,"+
            "lat TEXT,"+
            "lng TEXT,"+
            "img TEXT"+
            ")";

        try {
            db = openDatabase('mydb', '1.0', 'Test DB', 2 * 1024 * 1024);

            db.transaction(function (tx) {
                tx.executeSql(createTable);
            },function(error){alert(error.message)},function(){
                getPostsList();
            });

        } catch (e){
            alert(e);
            //No WEBSQL
        }
    }
    checkConnection();

    $("#sort-select").bind( "change", function(event, ui) {
        var option = $("#sort-select").val();
        switch (option) {
            case "newToOld":
                posts = posts.sort(function(a,b){
                    return(
                        a.timeDate < b.timeDate ? 1 :
                        a.timeDate > b.timeDate ? -1 :
                        0
                    );
                });
                break;
            case "oldToNew":
                posts = posts.sort(function(a,b){
                    return(
                        a.timeDate < b.timeDate ? -1 :
                        a.timeDate > b.timeDate ? 1 :
                        0
                    );
                });
                break;
        }

        populatePosts();
    });
});

/**
 * @summary This function adds markers to the Google Map.
 * This also creates the info window with the picture, description and title of a post.
 */
function addMarkers(){
    if (posts.length > 0){
        for (var i=0; i<posts.length; i++){
            try {
                (function(j){
                    if (posts[j].lat != null || posts[j].lng != null){
                        var latlng = {lat: posts[j].lat, lng: posts[j].lng};
                        bounds.extend(latlng);
                        var marker = new google.maps.Marker({
                            position: latlng,
                            map: map,
                            clickable: true,
                            title: posts[j].title
                        });
                        marker.info = new google.maps.InfoWindow({
                            content: "<div id='marker-content'>"+
                            "<h2>" + posts[j].title +"</h2>" +
                            "<p>"+posts[j].timeDate.toLocaleString() + "</p>" +
                            "<img src='data:image/jpeg;base64," +posts[j].img+"' class='half-width-height'/>" +
                            "<p>"+posts[j].description +"</p>"
                        });
                        google.maps.event.addListener(marker, "click",function(){
                            marker.info.open(map,marker);
                        });
                        map.fitBounds(bounds);
                        map.setZoom(14);
                    }
                })(i);
            }catch (error){
                alert("Markers:" + error)
            }

        }
    }
}

var map,bounds;
/**
 * @summary The callback function from the Google Maps API.
 */
function initMap(){
    bounds = new google.maps.LatLngBounds();
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: -34.397, lng: 150.644},
        zoom: 8
    });
}

/**
 * @summary This function saves a sighting to the database.
 * Handles IndexedDB and WebSQL depending on which is supported by the device.
 *
 * @param title
 * @param description
 * @param species
 * @param timeDate
 * @param lat
 * @param lng
 */
function saveSighting(title,description,species,timeDate,lat,lng){
    if (indexedDBsupport){
        var transaction = db.transaction(["posts"],"readwrite");
        var store = transaction.objectStore("posts");
        var post = {
            title:title,
            description:description,
            species:species,
            timeDate:timeDate,
            lat:lat,
            lng:lng,
            img:imgBase64
        };
        var request = store.add(post);
        request.onerror = function(e) {
            console.log("Error",e.target.error.name);
        };
        request.onsuccess = function(e) {
            console.log("Added to database");
            clearInputForm();
            getPostsList();
            $.mobile.changePage( "#home-page" );
        }
    } else {
        try {
            db.transaction(function(tx){
                var formattedValues = [];
                formattedValues.push(title);
                formattedValues.push(description);
                formattedValues.push(species);
                formattedValues.push(timeDate);
                formattedValues.push(lat);
                formattedValues.push(lng);
                formattedValues.push(imgBase64);
                tx.executeSql("INSERT INTO posts2 ( title, description, species, timeDate, lat, lng, img) VALUES ( ?, ?, ?, ?, ?, ?, ? )",
                    formattedValues);
            },function(error){alert(error.message)},function(){
                clearInputForm();
                getPostsList();
                $.mobile.changePage( "#home-page" );
            })
        } catch (e){alert(e)}
    }
}

/**
 * @summary This was a debug function to empty an indexedDB database.
 */
function clearDatabase(){
    // create an object store on the transaction
    var objectStore = transaction.objectStore("posts");

    // clear all the data out of the object store
    var objectStoreRequest = objectStore.clear();

    objectStoreRequest.onsuccess = function(event) {
        // report the success of our clear operation
        alert("cleared");
    };
}


/**
 * @summary This function retrieves all the data from the datastore.
 * It has functionality for IndexedDB if it is supported and WebSQL if it is not.
 */
function getPostsList(){
    posts = [];
    $("#sort-select").val("oldToNew");
    if (indexedDBsupport){
        db.transaction(["posts"],"readonly").objectStore("posts").openCursor().onsuccess = function(e){
            var cursor = e.target.result;
            if (cursor){
                try {
                    var post = {
                        id:cursor.key,
                        title:cursor.value["title"],
                        description:cursor.value["description"],
                        species:cursor.value["species"],
                        timeDate:cursor.value["timeDate"],
                        lat:cursor.value["lat"],
                        lng:cursor.value["lng"],
                        img:cursor.value["img"]
                    };
                    posts.push(post);
                    cursor.continue();
                } catch (error){
                    alert("IndexedDB getPostList: "+error)
                }

            } else{
                addMarkers();
                populatePosts();
            }

        };
    } else {
        try{
            db.transaction(function (tx){
                tx.executeSql('SELECT * FROM posts2', [], function(tx, results){
                    var len = results.rows.length;

                    for (var i=0; i < len; i++){
                        var post = {
                            id:results.rows.item(i).id,
                            title:results.rows.item(i).title,
                            description:results.rows.item(i).description,
                            species:results.rows.item(i).species,
                            timeDate:results.rows.item(i).timeDate,
                            lat:+results.rows.item(i).lat,
                            lng:+results.rows.item(i).lng,
                            img:results.rows.item(i).img
                        };
                        posts.push(post);
                    }
                    addMarkers();
                    populatePosts();
                });

            });
        } catch (e){alert(e)}
    }
}

/**
 * @summary This function generates the HTML required for a list item on the home page.
 */
function populatePosts(){
    var html = "";
    for (var i = 0; i<posts.length;i++){
        switch (posts[i].species){
            case "mammal":
                speciesImage = "mammal.png";
                break;
            case "bird":
                speciesImage = "bird.png";
                break;
            case "reptile":
                speciesImage = "reptile.png";
                break;
            case "fish":
                speciesImage = "fish.png";
                break;
        }

        html += "<li><h2><img class='species-icon' src='img/"+ speciesImage+"'/>"+posts[i].title+"</h2>";
        html += "<p>"+posts[i].timeDate.toLocaleString() + "</p>";
        html += "<img src='data:image/jpeg;base64," +posts[i].img+"' class='half-width-height'/>";
        html += "<p>"+posts[i].description +"</p>" +
            "<a class='ui-btn ui-btn-inline sharing-button' id='"+ posts[i].id +"-share'><img class='icon-bar' src='img/share.png'/></a>" +
            "<a class='ui-btn ui-btn-inline ' id='"+ posts[i].id +"-upload'><img class='icon-bar' src='img/upload.png'/></a>" +
            "<a class='ui-btn ui-btn-inline ' id='"+ posts[i].id +"-delete'><img class='icon-bar' src='img/delete.png'/></a>" +
            "<hr/></li>";
    }
    $("#posts-list").html(html);
    bindPostsButton();
}


/**
 * @summary This function gives click functionality to each button on a post.
 */
function bindPostsButton(){
    for (var i=0;i<posts.length;i++){
        $("#"+posts[i].id+"-share").bind("click",function(){
            var key = this.id.split("-");
            sharePost(+key[0]);
        });
        $("#"+posts[i].id+"-upload").bind("click",function(){
            var key = this.id.split("-");
            uploadPost(+key[0])
        });
        $("#"+posts[i].id+"-delete").bind("click",function(){
            var key = this.id.split("-");
            deletePost(+key[0])
        });
    }
}

var contactsList =[];

/**
 * @summary This function handles the share button press and displays a list of contacts.
 *
 * This function was supposed to make use of the email plugin however that did not work and had to be removed.
 *
 * @param postKey
 */
function sharePost(postKey){
    var fields = ["*"];
    var options = {multiple: true};
    navigator.contacts.find(fields,function(contacts){
        for (var i = 0; i <contacts.length; i++){
            if (contacts[i].emails != null){ //only contacts with email
                if (contacts[i].name.formatted != undefined){ //only contacts with name
                    contactsList.push(contacts[i]);
                }
            }
        }
        var html = "";
        for (var i=0;i<contactsList.length;i++){
            html += "<a href='#' id='email-"+ i +"' class='ui-btn ui-shadow ui-corner-all'>"+contactsList[i].name.formatted+"</a>"
        }
        $("#contact-buttons").html(html);
    },function (error){
        console.log(error);
    },options);
    $.mobile.changePage( "#sharing-dialog", { role: "dialog" } );

}

function bindEmailButton(postKey){
    for (var i=0; i<contactsList.length;i++){
        $("#email-"+i).bind("click",function(){
            var i = this.id.split("-");
            i = i[1];

        });
    }
}

/**
 * @summary This function uploads the post.
 *
 * Uploads the post to http://www.pict.uws.ac.uk/~dwt05/ca2/appImages/addPost.php
 * This also handles the authentication required to upload to the pict server.
 * Makes use of the posts key to determine which file is to be uploaded.
 *
 * @param postKey
 */
function uploadPost(postKey){
    if (checkConnection() == "Online"){
        var url = "http://pict.uws.ac.uk/~dwt05/ca2/appImages/addPost.php";
        var user = "dwt05";
        var pswd = "5597";

        function makeBaseAuth(user, pswd){
            var token = user + ':' + pswd;
            var hash = "";
            if (btoa) {
                hash = btoa(token);
            }
            return "Basic " + hash;
        }

        try {
            for (var i = 0; i<posts.length;i++){
                if (posts[i].id == postKey){
                    alert("Attempting to Save. This might take a few seconds.");
                    $.ajax({
                            beforeSend: function (xhr) {
                                xhr.setRequestHeader('Authorization', makeBaseAuth(user, pswd));
                            },
                            method: "POST",
                            url: url,
                            data: {post:JSON.stringify(posts[i])}
                        })
                        .done(function( msg ) {
                            alert( "Data saved to server.");
                        });

                }
            }

        } catch (e){
            alert(e);
        }

    } else {
        alert("Please check your connection.");
    }
}

/**
 * @summary This function deletes a post from the database by their key.
 * @param postKey
 */
function deletePost(postKey){
    if (indexedDBsupport){
        var request = db.transaction("posts", "readwrite").objectStore("posts").delete(+postKey);
        request.onerror = function(e) {
            console.log("Error",e.target.error.name);
        };
        request.onsuccess = function(e) {
            console.log("Deleted from database");
            getPostsList();
        }
    } else {
        db.transaction(function (tx) {
            tx.executeSql('DELETE FROM posts2 WHERE id = ?', [postKey], function(){getPostsList()}, function(error){alert(error)});
        });
    }
}

/**
 * @summary This function clears the input form and resets the camera link image.
 */
function clearInputForm(){
    $("#new-title").val("");
    $("#new-description").val("");
    var image = document.getElementById('new-image-image');
    image.src = "img/noimage.jpg";
}


/**
 * @summary This function checks the connectivity of the users device.
 * @returns {string} online or offline.
 */
function checkConnection() {
    var networkState = navigator.connection.type;
    var states = {};
    states[Connection.UNKNOWN]  = 'Online';
    states[Connection.ETHERNET] = 'Online';
    states[Connection.WIFI]     = 'Online';
    states[Connection.CELL_2G]  = 'Online';
    states[Connection.CELL_3G]  = 'Online';
    states[Connection.CELL_4G]  = 'Online';
    states[Connection.CELL]     = 'Offline';
    states[Connection.NONE]     = 'Offline';

    return(states[networkState]);
}