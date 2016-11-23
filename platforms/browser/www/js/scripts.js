/**
 * Created by Andy on 17/11/2016.
 */
var lat,lng,imgBase64;

var db = null;
var indexedDBsupport;

var posts=[]; //array of posts read from database

$().ready(function(){
    $("#new-image-button").bind("click",function(){
        console.log("Launch image capture");
        var image = $("#new-image-image");
        image.attr("src","gear.gif");
        //picture success set #new-image-image src as picture that was taken
        navigator.camera.getPicture(onSuccess, onFail, { quality: 50,
            destinationType: Camera.DestinationType.DATA_URL
        });
    });
    function onSuccess(imageData) {
        var image = document.getElementById('new-image-image');
        image.src = "data:image/jpeg;base64," + imageData;
        imgBase64 = imageData; //Save global variable accessable by save function
    }
    function onFail(message) {
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
    }

    function geoError(position){
        lat = null;
        lng = null;
    }
});

//asdasd
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


});

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
    console.log(post.timeDate);
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
            var post = {
                title:cursor.value["title"],
                description:cursor.value["description"],
                species:cursor.value["species"],
                timeDate:cursor.value["timeDate"],
                lat:cursor.value["lat"],
                lng:cursor.value["lng"],
                img:cursor.value["img"]
            };
            console.log(post.title);
            posts.push(post);
            cursor.continue();
        }
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
        html += "<p>"+posts[i].description +"</p><hr/></li>";
    }
    $("#posts-list").html(html);


}

function validateInputs(){

}

function clearInputForm(){
    $("#new-title").val("");
    $("#new-description").val("");
}

