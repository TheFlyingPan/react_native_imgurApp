import React, {Component} from 'react';
import { StyleSheet, Text, View, ScrollView, 
        Image, Button, FlatList, TouchableWithoutFeedback, YellowBox } from 'react-native';
import { WebView } from 'react-native-webview';
import { SearchBar } from 'react-native-elements';
import NavBar, { NavGroup, NavButton, NavButtonText, NavTitle } from 'react-native-nav'
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

export default class App extends Component {
  constructor (props) {
    super(props);
    this.state = {
      etat: "loading",
      dataSource: null,
      url: null,
      access_token: null,
      image: null,
      imageUri: "",
      base64img: "",
      allImages: null,
      allSearchImages: null,
      allFavoriteImages: null,
      search: '', 
    }
  }

  componentDidMount() {
    
  }

  // ------------ UPLOAD IMAGE ------------ //

  _pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      // aspect: [4, 3],
      quality: 1
    });

    console.log(result);
    if (!result.cancelled) {
      this.setState({ image: result.uri })
      this.state.imageUri = result.uri.toString()
      const base64 = await FileSystem.readAsStringAsync(this.state.imageUri, { encoding: 'base64' })
      this.state.base64img = base64.toString()
    }
    this.postUploadimage()
  }

  postUploadimage() {
    var myHeaders = new Headers();
    myHeaders.append("Authorization", "Client-ID aecbd3e0b34d1f2");
    // myHeaders.append("Authorization", "Bearer ", this.state.access_token)

    var formdata = new FormData();
    let stringToAppend = "data:image/jpg;base64," + this.state.imageUri
    formdata.append("image", this.state.base64img)
    // formdata.append("type", "URL")

    var requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: formdata,
      redirect: 'follow'
      };

    fetch("https://api.imgur.com/3/upload", requestOptions)
      .then(response => response.json())
      .then(result => console.log(result))
      .catch(error => console.log('error', error));
  }

  // ------------ HOME PAGE ------------ //

  getResponseJson() {
    var myHeaders = new Headers()
    myHeaders.append("Authorization", "Bearer ", this.state.access_token)
    
    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow'
    };
    
    fetch("https://api.imgur.com/3/account/me/images", requestOptions)
      .then(response => response.json())
      .then(result => {
        this.getImages(result)
      })
      .catch(error => console.log('error', error))
  }

  getImages(JSON) {
    let listImages = []
    JSON.data.forEach(image => {
      listImages.push({key:image.link})
    })
    this.state.allImages = listImages
    console.log("All images : ")
    console.log(this.state.allImages)
    this.forceUpdate()
  }

  parseUrl(urlToParse) {
    let url = urlToParse
    this.state.url = url
    let regex = /[#]([^=#]+)=([^&#]*)/g,
      params = {},
      match
    while ((match = regex.exec(url))) {
      params[match[1]] = match[2]
      this.state.access_token = match[2]
    }
    this.getResponseJson()
  }

  // ------------ FAVORIS ------------ //

  addToFavorites(image) {
    var myHeaders = new Headers();
    myHeaders.append("Authorization", "Bearer ", this.state.access_token);

    var requestOptions = {
      method: 'POST',
      headers: myHeaders,
      redirect: 'follow'
    };
    let urlToFetch = "https://api.imgur.com/3/image/" + image.hash + "/favorite"
    fetch(urlToFetch, requestOptions)
      .then(response => response.json())
      .then(result => {
        if (result.data == "favorited")
          alert("Image ajouté aux favoris")
        else
          alert("Image retiré des favoris")
      })
      .catch(error => console.log('error', error));
  }

  searchFavorites() {
    var myHeaders = new Headers();
    myHeaders.append("Authorization", "Bearer", this.state.access_token);

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow'
    };

    fetch("https://api.imgur.com/3/account/Capellito/favorites", requestOptions)
      .then(response => response.json())
      .then(result => { 
        this.getFavorites(result)
      })
      .catch(error => console.log('error', error));
  }

  getFavorites(JSON){
    let listImages = []
    JSON.data.forEach(image => {
      listImages.push({key: image.link, hash: image.id})
    })
    this.state.allFavoriteImages = listImages
    this.forceUpdate()
  }

  // ------------ SEARCH PAGE ------------ //

  
  updateSearch = search => {
    this.setState({ search })
    setTimeout(() => {this.searchImg()}, 50)
  }

  searchImg() {
    console.log("searchImg : " + this.state.search)
    var myHeaders = new Headers();
    myHeaders.append("Authorization", "Client-ID aecbd3e0b34d1f2");

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow'
    };
    let urlToFetch = "https://api.imgur.com/3/gallery/search?q=" + this.state.search
    fetch(urlToFetch, requestOptions)
      .then(response => response.json())
      .then(result => {
        this.getSearchImages(result)
      })
      .catch(error => console.log('error', error));
  }

  getSearchImages(JSON) { 
    let listImages = []
    let count = 0
    JSON.data.forEach(image => {
      if (count < 20)
        if (image.images) {
            if (image.images[0].type.toString() != "video/mp4") {
              listImages.push({key:image.images[0].link, hash:image.images[0].id})
              count++
            }
        }
        else {
          if (image.type.toString() != "video/mp4") {
            listImages.push({key:image.link, hash:image.id})
            count++
          }
        }
    })
    this.state.allSearchImages = listImages
    setTimeout(() => {this.forceUpdate()}, 500)

  }



  render () {
    YellowBox.ignoreWarnings([
      'VirtualizedLists should never be nested',
      '',
    ])
    // PAGE DE CONNECTION
    if (this.state.etat == "loading") {
      return(
          <WebView
            source={{ uri: 'https://api.imgur.com/oauth2/authorize?client_id=aecbd3e0b34d1f2&response_type=token' }}
              onNavigationStateChange={navState => {
                let urlToCompare = navState.url.substring(0, 33)
                if (urlToCompare == "https://m.imgur.com/#access_token") {
                  this.state.etat = "loaded"
                  this.parseUrl(navState.url)
                  console.log("Acces token : " + this.state.access_token)
                }
            }}
          />
      )
    }
    // HOME PAGE
    if (this.state.etat == "loaded") {
      return (
      <View>
        <ScrollView>
        <Text style={styles.title}>Content loaded </Text>
        <NavBar>
          <NavTitle>
            {"BLBL"}
          </NavTitle>
          <NavGroup>

            <NavButton onPress={() => {
              this.state.etat = "searchImg"
              this.forceUpdate()
            }}>
              <NavButtonText>
                {"Rechercher"}
              </NavButtonText>
            </NavButton>

            <NavButton onPress={() => { 
              this.state.etat = "favoris"
              this.forceUpdate()
            }}>
              <NavButtonText>
                {"Favoris"}
              </NavButtonText>
            </NavButton>

            <NavButton onPress={() => { 
              this.state.etat = "upload"
              this.forceUpdate()
            }}>
              <NavButtonText>
                {"Upload"}
              </NavButtonText>
            </NavButton>

            <NavButton onPress={() => { 
              this.state.etat = "loading"
              this.forceUpdate()
            }}>
              <NavButtonText>
                {"¤"}
              </NavButtonText>
            </NavButton>

          </NavGroup>
        </NavBar>
        <FlatList
          numColumns={2}
          contentContainerStyle={{ alignItems:'center'}}
          data={this.state.allImages}
          renderItem={({ item }) => 
          <Image style={{ width: 150, height: 150 }} source={{ uri: item.key }}/> } 
        />
        </ScrollView>
      </View>
      );
    }
    // SEARCH PAGE
    if (this.state.etat == "searchImg") {
      return (
        <View>
          <ScrollView>
            <Text style={styles.title}>RECHERCHER ICI MOULA</Text>
            <NavBar>
          <NavTitle>
            {"BLBL"}
          </NavTitle>
          <NavGroup>

            <NavButton onPress={() => {
              this.state.etat = "loaded"
              this.forceUpdate()
            }}>
              <NavButtonText>
                {"Home"}
              </NavButtonText>
            </NavButton>

            <NavButton onPress={() => { 
              this.state.etat = "favoris"
              this.forceUpdate()
            }}>
              <NavButtonText>
                {"Favoris"}
              </NavButtonText>
            </NavButton>

            <NavButton onPress={() => { 
              this.state.etat = "upload"
              this.forceUpdate()
            }}>
              <NavButtonText>
                {"Upload"}
              </NavButtonText>
            </NavButton>

          </NavGroup>
        </NavBar>
            <SearchBar
              placeholder="Type Here..."
              onChangeText={this.updateSearch}
              value={this.state.search}
            />
            <FlatList
              numColumns={2}
              contentContainerStyle={{ alignItems:'center'}}
              data={this.state.allSearchImages}
              renderItem={({ item }) => 
              <TouchableWithoutFeedback onPress={ () =>  {
                console.log(item.hash)
                this.addToFavorites(item)
              }}>
                  <Image 
                    style={{ width: 150, height: 150 }} 
                    source={{ uri: item.key }}
                    // onClick={console.log("teeeeest")}
                  /> 
              </TouchableWithoutFeedback>
              }
            />
          </ScrollView>
        </View>
      );
    }
    // UPLOAD PAGE
    if (this.state.etat == "upload") {
      let { image } = this.state;
      return (
        <View>
          <Text style={styles.title}>UPLOAD PHOTO</Text>          
          <NavBar>
            <NavTitle>
              {"BLBL"}
            </NavTitle>
            <NavGroup>
              <NavButton onPress={() => {
                this.state.etat = "loaded"
                this.forceUpdate()
              }}>
                <NavButtonText>
                  {"Home"}
                </NavButtonText>
              </NavButton>
              <NavButton onPress={() => { 
                this.state.etat = "searchImg"
                this.forceUpdate()
              }}>
                <NavButtonText>
                  {"Rechercher"}
                </NavButtonText>
              </NavButton>
              <NavButton onPress={() => { 
                this.state.etat = "favoris"
                this.forceUpdate()
              }}>
              <NavButtonText>
                {"Favoris"}
              </NavButtonText>
            </NavButton>
            </NavGroup>
          </NavBar>
          <Button
            title="Pick an image from camera roll"
            onPress={this._pickImage}
          />
          {/* {image && this.postUploadimage()} */}
            
          <Button
          title="go back"
          onPress={() => { 
            this.state.etat = "loading"
            this.forceUpdate()
          }}
        />
        </View>
      );
    }
    // FAVORITE PAGE
    if (this.state.etat == "favoris") {
      this.searchFavorites()
      return (
        <View>
          <Text style={styles.title}>FAVORIS</Text>
          <NavBar>
            <NavTitle>
              {"BLBL"}
            </NavTitle>
            <NavGroup>
              <NavButton onPress={() => {
                this.state.etat = "loaded"
                this.forceUpdate()
              }}>
                <NavButtonText>
                  {"Home"}
                </NavButtonText>
              </NavButton>
              <NavButton onPress={() => { 
                this.state.etat = "searchImg"
                this.forceUpdate()
              }}>
                <NavButtonText>
                  {"Rechercher"}
                </NavButtonText>
              </NavButton>
              <NavButton onPress={() => { 
                this.state.etat = "upload"
                this.forceUpdate()
              }}>
              <NavButtonText>
                {"Upload"}
              </NavButtonText>
            </NavButton>
            </NavGroup>
          </NavBar>
          <FlatList
              numColumns={2}
              contentContainerStyle={{ alignItems:'center'}}
              data={this.state.allFavoriteImages}
              renderItem={({ item }) => 
                <TouchableWithoutFeedback onPress={ () =>  {
                  console.log(item.hash)
                  this.addToFavorites(item)
                }}>
                  <Image 
                    style={{ width: 150, height: 150 }} 
                    source={{ uri: item.key }}
                    // onClick={console.log("teeeeest")}
                  /> 
                </TouchableWithoutFeedback>
              }
            />
        </View>
      );
    }
  }
}

const styles = StyleSheet.create({
  title: {
    padding: 10,
    backgroundColor: "#05668D",
    color: "white",
    paddingTop: 30,
    fontSize: 20,
    textAlign: "center"
  },
  container: {
    justifyContent: "center"
  },
  bonsoir: {
    color: "white",
    fontSize: 17,
    borderColor: "white",
    borderWidth: 0,
  },
  salut: {
    color: "white",
    fontSize: 35,
  },
  image: {
    borderWidth: 2,
    borderColor: "white",
    backgroundColor: "black",
  },
  item: {
    flex: 1,
  },
});