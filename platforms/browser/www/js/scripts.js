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
        }

        //save then clear - clear handled on save success
        saveSighting(title,description,species,timeDate,lat,lng);
    });
    function geoSuccess(position){
        lat = (position.coords.latitude);
        lng = (position.coords.longitude);
        alert(lat,lng);
    }

    function geoError(position){
        lat = null;
        lng = null;
    }
});


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
    }

    checkConnection();
});

function addMarkers(){
    if (posts.length > 0){
        for (var i=0; i<posts.length; i++){
            try {
                (function(j){
                    var latlng = {lat: posts[j].lat, lng: posts[j].lng};
                    var marker = new google.maps.Marker({
                        position: latlng,
                        map: map,
                        clickable: true,
                        title: posts[j].title
                    });
                    marker.info = new google.maps.InfoWindow({
                        content: "<div id='marker-content'>"+
                        "<p>"+posts[j].timeDate.toLocaleString() + "</p>" +
                        "<img src='data:image/jpeg;base64," +posts[j].img+"' class='half-width-height'/>" +
                        "<p>"+posts[j].description +"</p>"
                    });
                    google.maps.event.addListener(marker, "click",function(){
                        marker.info.open(map,marker);
                    });

                })(i);
            }catch (error){
                alert(error)
            }

        }
    }
}

var map;
function initMap(){
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: -34.397, lng: 150.644},
        zoom: 8
    });
}

function saveSighting(title,description,species,timeDate,lat,lng){
    var transaction = db.transaction(["posts"],"readwrite");
    var store = transaction.objectStore("posts");
    console.log("saving....");
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
    }
}

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

function getPostsList(){
    posts = [];
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
                alert(error)
            }

        }
        addMarkers();
        populatePosts();
    };
}

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
        html += "<p>"+posts[i].description +" lat: "+posts[i].lat+" lng: "+posts[i].lng +"</p>" +
            "<a class='ui-btn ui-btn-inline sharing-button' id='"+ posts[i].id +"-share'><img class='icon-bar' src='img/share.png'/></a>" +
            "<a class='ui-btn ui-btn-inline ' id='"+ posts[i].id +"-upload'><img class='icon-bar' src='img/upload.png'/></a>" +
            "<a class='ui-btn ui-btn-inline ' id='"+ posts[i].id +"-delete'><img class='icon-bar' src='img/delete.png'/></a>" +
            "<hr/></li>";
    }
    $("#posts-list").html(html);
    bindPostsButton();
}

function bindPostsButton(){
    for (var i=0;i<posts.length;i++){
        $("#"+posts[i].id+"-share").bind("click",function(){
            sharePost(+this.id[0]);
        });
        $("#"+posts[i].id+"-upload").bind("click",function(){
            uploadPost(+this.id[0])
        });
        $("#"+posts[i].id+"-delete").bind("click",function(){
            deletePost(+this.id[0])
        });
    }
}

var contactsList =[];
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


function uploadPost(postKey){
    if (checkConnection() == "Online"){
        //Push to server
    } else {
        alert("Please check your connection.");
    }
}


function deletePost(postKey){
    var request = db.transaction("posts", "readwrite").objectStore("posts").delete(+postKey);
    request.onerror = function(e) {
        console.log("Error",e.target.error.name);
    };
    request.onsuccess = function(e) {
        console.log("Deleted from database");
        getPostsList(); //update list
    }
}

function validateInputs(){
//akjsd
}

function clearInputForm(){
    $("#new-title").val("");
    $("#new-description").val("");
}

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

