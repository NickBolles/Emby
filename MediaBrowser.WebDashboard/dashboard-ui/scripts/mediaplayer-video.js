﻿(function () {

    function createVideoPlayer(self) {

        var initialVolume;
        var idleState = true;

        var muteButton = null;
        var unmuteButton = null;
        var volumeSlider = null;
        var positionSlider;
        var currentTimeElement;

        self.currentSubtitleStreamIndex = null;

        self.getCurrentSubtitleStream = function () {
            return self.getSubtitleStream(self.currentSubtitleStreamIndex);
        };

        self.getSubtitleStream = function (index) {
            return self.currentMediaSource.MediaStreams.filter(function (s) {
                return s.Type == 'Subtitle' && s.Index == index;
            })[0];
        };

        self.toggleFullscreen = function () {
            if (self.isFullScreen()) {

                self.exitFullScreen();
            } else {
                requestFullScreen(document.body);
            }
        };

        self.resetEnhancements = function () {

            fadeOut(document.querySelector('#mediaPlayer'));
            $('#videoPlayer').removeClass('fullscreenVideo').removeClass('idlePlayer');
            $('.hiddenOnIdle').removeClass("inactive");
            $("video").remove();

            document.querySelector('.mediaButton.infoButton').classList.remove('active');
            document.querySelector('.videoControls .nowPlayingInfo').classList.add('hide');
            document.querySelector('.videoControls').classList.add('hiddenOnIdle');
        };

        function fadeOut(elem) {
            $(elem).hide();
            return;
            var keyframes = [
              { opacity: '1', offset: 0 },
              { opacity: '0', offset: 1 }];
            var timing = { duration: 300, iterations: 1 };
            elem.animate(keyframes, timing).onfinish = function () {
                $(elem).hide();
            };
        }

        self.exitFullScreen = function () {

            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }

            $('#videoPlayer').removeClass('fullscreenVideo');
        };

        self.isFullScreen = function () {
            return document.fullscreen || document.mozFullScreen || document.webkitIsFullScreen || document.msFullscreenElement ? true : false;
        };

        self.showChaptersFlyout = function () {

            function onFlyoutClose() {
                $('.itemVideo').css('visibility', 'visible');
            }

            require(['jqmicons']);

            var html = getChaptersFlyoutHtml();

            var elem = $('.videoChaptersPopup').html(html)
                .trigger('create')
                .popup("option", "positionTo", $('.videoChaptersButton'))
                .off('popupafterclose', onFlyoutClose)
                .on('popupafterclose', onFlyoutClose);

            elem.popup("open").parents(".ui-popup-container").css("margin-top", 30);
        };

        self.showSubtitleMenu = function () {

            var streams = self.currentMediaSource.MediaStreams.filter(function (currentStream) {
                return currentStream.Type == "Subtitle";
            });

            var currentIndex = self.currentSubtitleStreamIndex || -1;

            streams.unshift({
                Index: -1,
                Language: "Off"
            });

            var menuItems = streams.map(function (stream) {

                var attributes = [];

                attributes.push(stream.Language || Globalize.translate('LabelUnknownLanguage'));

                if (stream.Codec) {
                    attributes.push(stream.Codec);
                }

                var name = attributes.join(' - ');

                if (stream.IsDefault) {
                    name += ' (D)';
                }
                if (stream.IsForced) {
                    name += ' (F)';
                }
                if (stream.External) {
                    name += ' (EXT)';
                }

                var opt = {
                    name: name,
                    id: stream.Index
                };

                if (stream.Index == currentIndex) {
                    opt.ironIcon = "check";
                }

                return opt;
            });

            require(['actionsheet'], function () {

                ActionSheetElement.show({
                    items: menuItems,
                    positionTo: $('.videoSubtitleButton')[0],
                    callback: function (id) {

                        var index = parseInt(id);
                        if (index != currentIndex) {
                            self.onSubtitleOptionSelected(index);
                        }
                    }
                });

            });
        };

        self.showQualityFlyout = function () {

            var currentSrc = self.getCurrentSrc(self.currentMediaRenderer).toLowerCase();
            var isStatic = currentSrc.indexOf('static=true') != -1;

            var videoStream = self.currentMediaSource.MediaStreams.filter(function (stream) {
                return stream.Type == "Video";
            })[0];
            var videoWidth = videoStream ? videoStream.Width : null;
            var videoHeight = videoStream ? videoStream.Height : null;

            var options = self.getVideoQualityOptions(videoWidth, videoHeight);

            if (isStatic) {
                options[0].name = "Direct";
            }

            var menuItems = options.map(function (o) {

                var opt = {
                    name: o.name,
                    id: o.bitrate
                };

                if (o.selected) {
                    opt.ironIcon = "check";
                }

                return opt;
            });

            var selectedId = options.filter(function (o) {
                return o.selected;
            });
            selectedId = selectedId.length ? selectedId[0].bitrate : null;
            require(['actionsheet'], function () {

                ActionSheetElement.show({
                    items: menuItems,
                    positionTo: $('.videoQualityButton')[0],
                    callback: function (id) {

                        var bitrate = parseInt(id);
                        if (bitrate != selectedId) {
                            self.onQualityOptionSelected(bitrate);
                        }
                    }
                });

            });
        };

        self.showAudioTracksFlyout = function () {

            var options = self.currentMediaSource.MediaStreams.filter(function (currentStream) {
                return currentStream.Type == "Audio";
            });

            var currentIndex = getParameterByName('AudioStreamIndex', self.getCurrentSrc(self.currentMediaRenderer));

            var menuItems = options.map(function (stream) {

                var attributes = [];

                attributes.push(stream.Language || Globalize.translate('LabelUnknownLanguage'));

                if (stream.Codec) {
                    attributes.push(stream.Codec);
                }
                if (stream.Profile) {
                    attributes.push(stream.Profile);
                }

                if (stream.BitRate) {
                    attributes.push((Math.floor(stream.BitRate / 1000)) + ' kbps');
                }

                if (stream.Channels) {
                    attributes.push(stream.Channels + ' ch');
                }

                var name = attributes.join(' - ');

                if (stream.IsDefault) {
                    name += ' (D)';
                }

                var opt = {
                    name: name,
                    id: stream.Index
                };

                if (stream.Index == currentIndex) {
                    opt.ironIcon = "check";
                }

                return opt;
            });

            require(['actionsheet'], function () {

                ActionSheetElement.show({
                    items: menuItems,
                    positionTo: $('.videoAudioButton')[0],
                    callback: function (id) {

                        var index = parseInt(id);
                        if (index != currentIndex) {
                            self.onAudioOptionSelected(index);
                        }
                    }
                });

            });
        };

        self.setAudioStreamIndex = function (index) {
            self.changeStream(self.getCurrentTicks(), { AudioStreamIndex: index });
        };

        self.setSubtitleStreamIndex = function (index) {

            if (!self.currentMediaRenderer.supportsTextTracks()) {

                self.changeStream(self.getCurrentTicks(), { SubtitleStreamIndex: index });
                self.currentSubtitleStreamIndex = index;
                return;
            }

            var currentStream = self.getCurrentSubtitleStream();

            var newStream = self.getSubtitleStream(index);

            if (!currentStream && !newStream) return;

            var selectedTrackElementIndex = -1;

            if (currentStream && !newStream) {

                if (currentStream.DeliveryMethod != 'External') {

                    // Need to change the transcoded stream to remove subs
                    self.changeStream(self.getCurrentTicks(), { SubtitleStreamIndex: -1 });
                }
            }
            else if (!currentStream && newStream) {

                if (newStream.DeliveryMethod == 'External') {
                    selectedTrackElementIndex = index;
                } else {

                    // Need to change the transcoded stream to add subs
                    self.changeStream(self.getCurrentTicks(), { SubtitleStreamIndex: index });
                }
            }
            else if (currentStream && newStream) {

                if (newStream.DeliveryMethod == 'External') {
                    selectedTrackElementIndex = index;

                    if (currentStream.DeliveryMethod != 'External') {
                        self.changeStream(self.getCurrentTicks(), { SubtitleStreamIndex: -1 });
                    }
                } else {

                    // Need to change the transcoded stream to add subs
                    self.changeStream(self.getCurrentTicks(), { SubtitleStreamIndex: index });
                }
            }

            self.setCurrentTrackElement(selectedTrackElementIndex);

            self.currentSubtitleStreamIndex = index;
        };

        self.setCurrentTrackElement = function (index) {

            var textStreams = self.currentMediaSource.MediaStreams.filter(function (s) {
                return s.DeliveryMethod == 'External';
            });

            var newStream = textStreams.filter(function (s) {
                return s.Index == index;
            })[0];

            var trackIndex = newStream ? textStreams.indexOf(newStream) : -1;

            self.currentMediaRenderer.setCurrentTrackElement(trackIndex);
        };

        self.updateTextStreamUrls = function (startPositionTicks) {

            self.currentMediaRenderer.updateTextStreamUrls(startPositionTicks);
        };

        self.updateNowPlayingInfo = function (item) {

            if (!item) {
                throw new Error('item cannot be null');
            }

            var mediaControls = $("#videoPlayer");

            var state = self.getPlayerStateInternal(self.currentMediaRenderer, item.CurrentProgram || item, self.currentMediaSource);

            var url = "";
            var imageWidth = 400;
            var imageHeight = 300;

            if (state.NowPlayingItem.PrimaryImageTag) {

                url = ApiClient.getScaledImageUrl(state.NowPlayingItem.PrimaryImageItemId, {
                    type: "Primary",
                    width: imageWidth,
                    tag: state.NowPlayingItem.PrimaryImageTag
                });
            }
            else if (state.NowPlayingItem.PrimaryImageTag) {

                url = ApiClient.getScaledImageUrl(state.NowPlayingItem.PrimaryImageItemId, {
                    type: "Primary",
                    width: imageWidth,
                    tag: state.NowPlayingItem.PrimaryImageTag
                });
            }
            else if (state.NowPlayingItem.BackdropImageTag) {

                url = ApiClient.getScaledImageUrl(state.NowPlayingItem.BackdropItemId, {
                    type: "Backdrop",
                    height: imageHeight,
                    tag: state.NowPlayingItem.BackdropImageTag,
                    index: 0
                });

            }
            else if (state.NowPlayingItem.ThumbImageTag) {

                url = ApiClient.getScaledImageUrl(state.NowPlayingItem.ThumbImageItemId, {
                    type: "Thumb",
                    height: imageHeight,
                    tag: state.NowPlayingItem.ThumbImageTag
                });
            }

            if (url) {
                $('.nowPlayingImage', mediaControls).html('<img src="' + url + '" />');
            } else {
                $('.nowPlayingImage', mediaControls).html('');
            }

            if (state.NowPlayingItem.LogoItemId) {

                url = ApiClient.getScaledImageUrl(state.NowPlayingItem.LogoItemId, {
                    type: "Logo",
                    height: 42,
                    tag: state.NowPlayingItem.LogoImageTag
                });

                $('.videoTopControlsLogo', mediaControls).html('<img src="' + url + '" />');
            } else {
                $('.videoTopControlsLogo', mediaControls).html('');
            }

            var elem = $('.nowPlayingTabs', mediaControls).html(getNowPlayingTabsHtml(item.CurrentProgram || item)).lazyChildren();

            $('.nowPlayingTabButton', elem).on('click', function () {

                if (!$(this).hasClass('selectedNowPlayingTabButton')) {
                    $('.selectedNowPlayingTabButton').removeClass('selectedNowPlayingTabButton');
                    $(this).addClass('selectedNowPlayingTabButton');
                    $('.nowPlayingTab').hide();
                    $('.' + this.getAttribute('data-tab')).show().trigger('scroll');
                }
            });

            $('.chapterCard', elem).on('click', function () {

                self.seek(parseInt(this.getAttribute('data-position')));
            });
        };

        function getNowPlayingTabsHtml(item) {

            var html = '';

            html += '<div class="nowPlayingTabButtons">';

            html += '<a href="#" class="nowPlayingTabButton selectedNowPlayingTabButton" data-tab="tabInfo">' + Globalize.translate('TabInfo') + '</a>';

            if (item.Chapters && item.Chapters.length) {
                html += '<a href="#" class="nowPlayingTabButton" data-tab="tabScenes">' + Globalize.translate('TabScenes') + '</a>';
            }

            if (item.People && item.People.length) {
                html += '<a href="#" class="nowPlayingTabButton" data-tab="tabCast">' + Globalize.translate('TabCast') + '</a>';
            }

            html += '</div>';

            html += '<div class="tabInfo nowPlayingTab">';
            var nameHtml = MediaController.getNowPlayingNameHtml(item, false);
            nameHtml = '<div class="videoNowPlayingName">' + nameHtml + '</div>';

            var miscInfo = LibraryBrowser.getMiscInfoHtml(item);
            if (miscInfo) {

                nameHtml += '<div class="videoNowPlayingRating">' + miscInfo + '</div>';
            }

            var ratingHtml = LibraryBrowser.getRatingHtml(item);
            if (ratingHtml) {

                nameHtml += '<div class="videoNowPlayingRating">' + ratingHtml + '</div>';
            }

            if (item.Overview) {

                nameHtml += '<div class="videoNowPlayingOverview">' + item.Overview + '</div>';
            }

            html += nameHtml;
            html += '</div>';

            if (item.Chapters && item.Chapters.length) {
                html += '<div class="tabScenes nowPlayingTab hiddenScrollX" style="display:none;white-space:nowrap;margin-bottom:2em;">';
                var chapterIndex = 0;
                html += item.Chapters.map(function (c) {

                    var width = 240;
                    var chapterHtml = '<a class="card backdropCard chapterCard" href="#" style="margin-right:1em;width:' + width + 'px;" data-position="' + c.StartPositionTicks + '">';
                    chapterHtml += '<div class="cardBox">';
                    chapterHtml += '<div class="cardScalable">';
                    chapterHtml += '<div class="cardPadder"></div>';

                    chapterHtml += '<div class="cardContent">';

                    if (c.ImageTag) {

                        var chapterImageUrl = ApiClient.getScaledImageUrl(item.Id, {
                            width: width,
                            tag: c.ImageTag,
                            type: "Chapter",
                            index: chapterIndex
                        });
                        chapterHtml += '<div class="cardImage lazy" data-src="' + chapterImageUrl + '"></div>';

                    } else {
                        chapterHtml += '<div class="cardImage" style="background:#444;"></div>';
                    }

                    chapterHtml += '<div class="cardFooter">';
                    if (c.Name) {
                        chapterHtml += '<div class="cardText">' + c.Name + '</div>';
                    }
                    chapterHtml += '<div class="cardText">' + Dashboard.getDisplayTime(c.StartPositionTicks) + '</div>';
                    chapterHtml += '</div>';
                    chapterHtml += '</div>';

                    chapterHtml += '</div>';
                    chapterHtml += '</div>';
                    chapterHtml += '</a>';

                    chapterIndex++;

                    return chapterHtml;

                }).join('');
                html += '</div>';
            }

            if (item.People && item.People.length) {
                html += '<div class="tabCast nowPlayingTab hiddenScrollX" style="display:none;white-space:nowrap;">';
                html += item.People.map(function (cast) {

                    var personHtml = '<div class="tileItem smallPosterTileItem" style="width:300px;">';

                    var imgUrl;
                    var height = 150;

                    if (cast.PrimaryImageTag) {

                        imgUrl = ApiClient.getScaledImageUrl(cast.Id, {
                            height: height,
                            tag: cast.PrimaryImageTag,
                            type: "primary",
                            minScale: 2
                        });

                    } else {

                        imgUrl = "css/images/items/list/person.png";
                    }

                    personHtml += '<div class="tileImage lazy" data-src="' + imgUrl + '" style="height:' + height + 'px;"></div>';



                    personHtml += '<div class="tileContent">';

                    personHtml += '<p>' + cast.Name + '</p>';

                    var role = cast.Role ? Globalize.translate('ValueAsRole', cast.Role) : cast.Type;

                    if (role == "GuestStar") {
                        role = Globalize.translate('ValueGuestStar');
                    }

                    role = role || "";

                    var maxlength = 40;

                    if (role.length > maxlength) {
                        role = role.substring(0, maxlength - 3) + '...';
                    }

                    personHtml += '<p>' + role + '</p>';

                    personHtml += '</div>';

                    personHtml += '</div>';
                    return personHtml;

                }).join('');
                html += '</div>';
            }

            return html;
        }

        function onPositionSliderChange() {

            var newPercent = parseInt(this.value);

            var newPositionTicks = (newPercent / 100) * self.currentMediaSource.RunTimeTicks;

            self.changeStream(Math.floor(newPositionTicks));
        }

        self.onChapterOptionSelected = function (elem) {

            if (!$(elem).hasClass('selectedMediaPopupOption')) {
                var ticks = parseInt(elem.getAttribute('data-value') || '0');

                self.changeStream(ticks);
            }
            $('.videoChaptersPopup').popup('close');
        };

        self.onAudioOptionSelected = function (index) {

            self.setAudioStreamIndex(index);
        };

        self.onSubtitleOptionSelected = function (index) {

            self.setSubtitleStreamIndex(index);
        };

        self.onQualityOptionSelected = function (bitrate) {

            AppSettings.maxStreamingBitrate(bitrate);

            self.changeStream(self.getCurrentTicks(), {
                Bitrate: bitrate
            });
        };

        self.toggleInfo = function () {

            var button = document.querySelector('.mediaButton.infoButton');
            var nowPlayingInfo = document.querySelector('.videoControls .nowPlayingInfo');

            if (button.classList.contains('active')) {
                button.classList.remove('active');
                document.querySelector('.videoControls').classList.add('hiddenOnIdle');

                fadeOutDown(nowPlayingInfo);

            } else {
                button.classList.add('active');
                document.querySelector('.videoControls').classList.remove('hiddenOnIdle');
                nowPlayingInfo.classList.remove('hide');
                fadeInUp(nowPlayingInfo);
            }
        };

        function fadeInUp(elem) {
            var keyframes = [
              { transform: 'translate3d(0, 100%, 0)', offset: 0 },
              { transform: 'none', offset: 1 }];
            var timing = { duration: 300, iterations: 1 };
            elem.animate(keyframes, timing);
        }

        function fadeOutDown(elem) {
            var keyframes = [{ transform: 'none', offset: 0 },
              { transform: 'translate3d(0, 100%, 0)', offset: 1 }];
            var timing = { duration: 300, iterations: 1 };
            elem.animate(keyframes, timing).onfinish = function () {
                elem.classList.add('hide');
            };
        }

        function ensureVideoPlayerElements() {

            var html = '<div id="mediaPlayer" style="display: none;">';

            html += '<div class="videoBackdrop">';
            html += '<div id="videoPlayer">';

            html += '<div id="videoElement">';
            html += '<div id="play" class="status"></div>';
            html += '<div id="pause" class="status"></div>';
            html += '</div>';

            html += '<div class="videoTopControls hiddenOnIdle">';
            html += '<div class="videoTopControlsLogo"></div>';
            html += '<div class="videoAdvancedControls">';

            html += '<paper-icon-button icon="skip-previous" class="previousTrackButton mediaButton videoTrackControl hide" onclick="MediaPlayer.previousTrack();"></paper-icon-button>';
            html += '<paper-icon-button icon="skip-next" class="nextTrackButton mediaButton videoTrackControl hide" onclick="MediaPlayer.nextTrack();"></paper-icon-button>';

            // Embedding onclicks due to issues not firing in cordova safari
            html += '<paper-icon-button icon="audiotrack" class="mediaButton videoAudioButton" onclick="MediaPlayer.showAudioTracksFlyout();"></paper-icon-button>';

            html += '<paper-icon-button icon="subtitles" class="mediaButton videoSubtitleButton" onclick="MediaPlayer.showSubtitleMenu();"></paper-icon-button>';

            html += '<paper-icon-button icon="videocam" class="mediaButton videoChaptersButton" onclick="MediaPlayer.showChaptersFlyout();"></paper-icon-button>';

            html += '<paper-icon-button icon="settings" class="mediaButton videoQualityButton" onclick="MediaPlayer.showQualityFlyout();"></paper-icon-button>';

            html += '<paper-icon-button icon="close" class="mediaButton" onclick="MediaPlayer.stop();"></paper-icon-button>';

            html += '</div>'; // videoAdvancedControls
            html += '</div>'; // videoTopControls

            // Create controls
            html += '<div class="videoControls hiddenOnIdle">';

            html += '<div class="nowPlayingInfo hide">';
            html += '<div class="nowPlayingImage"></div>';
            html += '<div class="nowPlayingTabs"></div>';
            html += '</div>'; // nowPlayingInfo

            html += '<div class="videoControlButtons">';
            html += '<paper-icon-button icon="skip-previous" class="previousTrackButton mediaButton videoTrackControl hide" onclick="MediaPlayer.previousTrack();"></paper-icon-button>';

            html += '<paper-icon-button id="video-playButton" icon="play-arrow" class="mediaButton unpauseButton" onclick="MediaPlayer.unpause();"></paper-icon-button>';
            html += '<paper-icon-button id="video-pauseButton" icon="pause" class="mediaButton pauseButton" onclick="MediaPlayer.pause();"></paper-icon-button>';

            html += '<paper-icon-button icon="skip-next" class="nextTrackButton mediaButton videoTrackControl hide" onclick="MediaPlayer.nextTrack();"></paper-icon-button>';

            html += '<paper-slider pin step=".1" min="0" max="100" value="0" class="videoPositionSlider" style="width:300px;vertical-align:middle;margin-left:-1em;"></paper-slider>';

            html += '<div class="currentTime">--:--</div>';

            html += '<paper-icon-button icon="volume-up" class="muteButton mediaButton" onclick="MediaPlayer.mute();"></paper-icon-button>';
            html += '<paper-icon-button icon="volume-off" class="unmuteButton mediaButton" onclick="MediaPlayer.unMute();"></paper-icon-button>';

            html += '<paper-slider pin step="1" min="0" max="100" value="0" class="videoVolumeSlider" style="width:100px;vertical-align:middle;margin-left:-1em;"></paper-slider>';

            html += '<paper-icon-button icon="fullscreen" class="mediaButton fullscreenButton" onclick="MediaPlayer.toggleFullscreen();" id="video-fullscreenButton"></paper-icon-button>';
            html += '<paper-icon-button icon="info" class="mediaButton infoButton" onclick="MediaPlayer.toggleInfo();"></paper-icon-button>';
            html += '</div>';

            html += '</div>'; // videoControls

            html += '</div>'; // videoPlayer
            html += '</div>'; // videoBackdrop
            html += '</div>'; // mediaPlayer

            var div = document.createElement('div');
            div.innerHTML = html;
            document.body.appendChild(div);
            $(div).trigger('create');
        }

        Dashboard.ready(function () {

            ensureVideoPlayerElements();

            var parent = $("#mediaPlayer");

            muteButton = $('.muteButton', parent);
            unmuteButton = $('.unmuteButton', parent);
            currentTimeElement = $('.currentTime', parent);

            positionSlider = $(".videoPositionSlider", parent).on('change', onPositionSliderChange)[0];

            positionSlider._setPinValue = function (value) {

                if (!self.currentMediaSource || !self.currentMediaSource.RunTimeTicks) {
                    this.pinValue = '--:--';
                    return;
                }

                var ticks = self.currentMediaSource.RunTimeTicks;
                ticks /= 100;
                ticks *= value;

                this.pinValue = Dashboard.getDisplayTime(ticks);
            };

            volumeSlider = $('.videoVolumeSlider', parent).on('change', function () {

                var vol = this.value;

                updateVolumeButtons(vol);
                self.setVolume(vol);
            })[0];
        });

        var idleHandlerTimeout;
        function idleHandler() {

            if (idleHandlerTimeout) {
                window.clearTimeout(idleHandlerTimeout);
            }

            if (idleState == true) {
                $('.hiddenOnIdle').removeClass("inactive");
                $('#videoPlayer').removeClass('idlePlayer');
            }

            idleState = false;

            idleHandlerTimeout = window.setTimeout(function () {
                idleState = true;
                $('.hiddenOnIdle').addClass("inactive");
                $('#videoPlayer').addClass('idlePlayer');
            }, 3500);
        }

        function updateVolumeButtons(vol) {

            if (vol) {
                muteButton.show();
                unmuteButton.hide();
            } else {
                muteButton.hide();
                unmuteButton.show();
            }
        }

        function requestFullScreen(element) {

            // Supports most browsers and their versions.
            var requestMethod = element.requestFullscreen || element.webkitRequestFullscreen || element.mozRequestFullScreen || element.msRequestFullscreen;

            if (requestMethod) { // Native full screen.
                requestMethod.call(element);
            } else {
                enterFullScreen();
            }

        }

        function enterFullScreen() {

            var player = $("#videoPlayer");

            player.addClass("fullscreenVideo");
        }

        function exitFullScreenToWindow() {

            var player = $("#videoPlayer");

            player.removeClass("fullscreenVideo");
        }

        function getChaptersFlyoutHtml() {

            var item = self.currentItem;
            var currentTicks = self.getCurrentTicks();
            var chapters = item.Chapters || [];

            var html = '';
            html += '<div class="videoPlayerPopupContent">';
            html += '<ul data-role="listview" data-inset="true"><li data-role="list-divider">' + Globalize.translate('HeaderScenes') + '</li>';
            html += '</ul>';

            html += '<div class="videoPlayerPopupScroller">';
            html += '<ul data-role="listview" data-inset="true">';

            var index = 0;

            html += chapters.map(function (chapter) {

                var cssClass = "mediaPopupOption";

                var selected = false;
                // Need to embed onclick handler due to delegation not working in iOS cordova
                var onclick = '';

                if (currentTicks >= chapter.StartPositionTicks) {
                    var nextChapter = chapters[index + 1];
                    selected = !nextChapter || currentTicks < nextChapter.StartPositionTicks;
                }

                if (!selected) {
                    onclick = ' onclick="MediaPlayer.onChapterOptionSelected(this);"';
                }

                var optionHtml = '<li><a' + onclick + ' data-value="' + chapter.StartPositionTicks + '" class="' + cssClass + '" href="#" style="padding-top:0;padding-bottom:0;">';

                var imgUrl = "css/images/media/chapterflyout.png";

                if (chapter.ImageTag) {

                    optionHtml += '<img src="' + imgUrl + '" style="visibility:hidden;" />';
                    imgUrl = ApiClient.getScaledImageUrl(item.Id, {
                        width: 160,
                        tag: chapter.ImageTag,
                        type: "Chapter",
                        index: index
                    });
                    optionHtml += '<div class="videoChapterPopupImage" style="background-image:url(\'' + imgUrl + '\');"></div>';

                } else {
                    optionHtml += '<img src="' + imgUrl + '" />';
                }

                // TODO: Add some indicator if selected = true

                optionHtml += '<p style="margin:12px 0 0;">';

                var textLines = [];
                textLines.push(chapter.Name);
                textLines.push(Dashboard.getDisplayTime(chapter.StartPositionTicks));

                optionHtml += textLines.join('<br/>');

                optionHtml += '</p>';

                optionHtml += '</a></li>';

                index++;

                return optionHtml;

            }).join('');

            html += '</ul>';
            html += '</div>';

            html += '</div>';

            return html;
        }

        function onPopState() {
            // Stop playback on browser back button nav
            self.stop();
            return;
        }

        function onBodyMouseMove() {
            idleHandler();
        }

        function onFullScreenChange() {
            if (self.isFullScreen()) {
                enterFullScreen();
                idleState = true;

            } else {
                exitFullScreenToWindow();
            }
        }

        function bindEventsForPlayback(mediaRenderer) {

            var hideElementsOnIdle = true;

            if (hideElementsOnIdle) {

                var itemVideo = document.querySelector('.itemVideo');
                if (itemVideo) {
                    Events.on(itemVideo, 'mousemove', idleHandler);
                    Events.on(itemVideo, 'keydown', idleHandler);
                    Events.on(itemVideo, 'scroll', idleHandler);
                    Events.on(itemVideo, 'mousedown', idleHandler);
                    idleHandler();
                }
            }

            $(document).on('webkitfullscreenchange', onFullScreenChange);
            $(document).on('mozfullscreenchange', onFullScreenChange);
            $(document).on('msfullscreenchange', onFullScreenChange);
            $(document).on('fullscreenchange', onFullScreenChange);

            $(window).one("popstate", onPopState);

            if (hideElementsOnIdle) {
                $(document.body).on("mousemove", onBodyMouseMove);
            }
        }

        function unbindEventsForPlayback(mediaRenderer) {

            $(document).off('webkitfullscreenchange', onFullScreenChange);
            $(document).off('mozfullscreenchange', onFullScreenChange);
            $(document).off('msfullscreenchange', onFullScreenChange);
            $(document).off('fullscreenchange', onFullScreenChange);

            // Stop playback on browser back button nav
            $(window).off("popstate", onPopState);

            $(document.body).off("mousemove", onBodyMouseMove);

            var itemVideo = document.querySelector('.itemVideo');
            if (itemVideo) {
                Events.off(itemVideo, 'mousemove', idleHandler);
                Events.off(itemVideo, 'keydown', idleHandler);
                Events.off(itemVideo, 'scroll', idleHandler);
                Events.off(itemVideo, 'mousedown', idleHandler);
            }
        }

        // Replace audio version
        self.cleanup = function (mediaRenderer) {

            currentTimeElement.html('--:--');

            unbindEventsForPlayback(mediaRenderer);
            self.removeFromPlaylist(self.currentPlaylistIndex());
        };

        self.playVideo = function (item, mediaSource, startPosition, callback) {

            //ApiClient.detectBitrate().done(function (b) {
            //    alert(b);
            //});
            requirejs(['videorenderer'], function () {

                var streamInfo = self.createStreamInfo('Video', item, mediaSource, startPosition);

                // Huge hack alert. Safari doesn't seem to like if the segments aren't available right away when playback starts
                // This will start the transcoding process before actually feeding the video url into the player
                if ($.browser.safari && !mediaSource.RunTimeTicks) {

                    Dashboard.showLoadingMsg();

                    ApiClient.ajax({
                        type: 'GET',
                        url: streamInfo.url.replace('master.m3u8', 'live.m3u8')
                    }).always(function () {

                        Dashboard.hideLoadingMsg();

                    }).done(function () {
                        self.playVideoInternal(item, mediaSource, startPosition, streamInfo, callback);
                    });

                } else {
                    self.playVideoInternal(item, mediaSource, startPosition, streamInfo, callback);
                }
            });
        };

        function supportsContentOverVideoPlayer() {
            return true;
        }

        self.playVideoInternal = function (item, mediaSource, startPosition, streamInfo, callback) {

            var videoUrl = streamInfo.url;

            self.startTimeTicksOffset = streamInfo.startTimeTicksOffset;

            var mediaStreams = mediaSource.MediaStreams || [];
            var subtitleStreams = mediaStreams.filter(function (s) {
                return s.Type == 'Subtitle';
            });

            // Reports of stuttering with h264 stream copy in IE
            if (streamInfo.playMethod == 'Transcode' && videoUrl.indexOf('.m3u8') == -1) {
                videoUrl += '&EnableAutoStreamCopy=false';
            }

            // Create video player
            var mediaPlayerContainer = $("#mediaPlayer").show();
            var videoControls = $('.videoControls', mediaPlayerContainer);

            //show stop button
            $('#video-playButton', videoControls).hide();
            $('#video-pauseButton', videoControls).show();
            $('.videoTrackControl').visible(false);

            var videoElement = $('#videoElement', mediaPlayerContainer);

            $('.videoQualityButton', videoControls).show();

            if (mediaStreams.filter(function (s) {
                return s.Type == "Audio";
            }).length) {
                $('.videoAudioButton').show();
            } else {
                $('.videoAudioButton').hide();
            }

            if (subtitleStreams.length) {
                $('.videoSubtitleButton').show();
            } else {
                $('.videoSubtitleButton').hide();
            }

            if (item.Chapters && item.Chapters.length && supportsContentOverVideoPlayer()) {
                $('.videoChaptersButton').hide();
            } else {
                $('.videoChaptersButton').hide();
            }

            var mediaRenderer = new VideoRenderer({
                poster: self.getPosterUrl(item)
            });

            var requiresNativeControls = !mediaRenderer.enableCustomVideoControls();

            if (requiresNativeControls) {
                $('#video-fullscreenButton', videoControls).hide();
            } else {
                $('#video-fullscreenButton', videoControls).show();
            }

            if (AppInfo.hasPhysicalVolumeButtons) {
                $(volumeSlider).visible(false);
                $('.muteButton', videoControls).addClass('hide');
                $('.unmuteButton', videoControls).addClass('hide');
            } else {
                $(volumeSlider).visible(true);
                $('.muteButton', videoControls).removeClass('hide');
                $('.unmuteButton', videoControls).removeClass('hide');
            }

            if (requiresNativeControls) {
                videoControls.addClass('hide');
            } else {
                videoControls.removeClass('hide');
            }

            initialVolume = self.getSavedVolume();

            mediaRenderer.volume(initialVolume);

            volumeSlider.value = initialVolume * 100;
            updateVolumeButtons(initialVolume);

            $(mediaRenderer).on("volumechange.mediaplayerevent", function (e) {

                updateVolumeButtons(this.volume());

            }).one("playing.mediaplayerevent", function () {

                // For some reason this is firing at the start, so don't bind until playback has begun
                $(this).on("ended", self.onPlaybackStopped).one('ended', self.playNextAfterEnded);

                self.onPlaybackStart(this, item, mediaSource);

            }).on("pause.mediaplayerevent", function (e) {

                $('#video-playButton', videoControls).show();
                $('#video-pauseButton', videoControls).hide();
                $("#pause", videoElement).show().addClass("fadeOut");
                setTimeout(function () {
                    $("#pause", videoElement).hide().removeClass("fadeOut");
                }, 300);

            }).on("playing.mediaplayerevent", function (e) {

                $('#video-playButton', videoControls).hide();
                $('#video-pauseButton', videoControls).show();
                $("#play", videoElement).show().addClass("fadeOut");
                setTimeout(function () {
                    $("#play", videoElement).hide().removeClass("fadeOut");
                }, 300);

            }).on("timeupdate.mediaplayerevent", function () {

                if (!positionSlider.dragging) {

                    self.setCurrentTime(self.getCurrentTicks(this), positionSlider, currentTimeElement);
                }

            }).on("error.mediaplayerevent", function () {

                var errorMsg = Globalize.translate('MessageErrorPlayingVideo');

                if (item.Type == "TvChannel") {
                    errorMsg += '<p>';
                    errorMsg += Globalize.translate('MessageEnsureOpenTuner');
                    errorMsg += '</p>';
                }

                Dashboard.alert({
                    title: Globalize.translate('HeaderVideoError'),
                    message: errorMsg
                });

                self.onPlaybackStopped.call(mediaRenderer);
                self.nextTrack();

            }).on("click.mediaplayerevent", function (e) {

                if (!$.browser.mobile) {
                    if (this.paused()) {
                        self.unpause();
                    } else {
                        self.pause();
                    }
                }

            }).on("dblclick.mediaplayerevent", function () {

                if (!$.browser.mobile) {
                    self.toggleFullscreen();
                }
            });

            bindEventsForPlayback(mediaRenderer);

            self.currentSubtitleStreamIndex = mediaSource.DefaultSubtitleStreamIndex;

            $(document.body).addClass('bodyWithPopupOpen');

            self.currentMediaRenderer = mediaRenderer;
            self.currentDurationTicks = self.currentMediaSource.RunTimeTicks;

            self.updateNowPlayingInfo(item);

            mediaRenderer.init().done(function () {

                self.setSrcIntoRenderer(mediaRenderer, videoUrl, item, self.currentMediaSource);

                if (callback) {
                    callback();
                }
            });
        };

        self.updatePlaylistUi = function () {
            var index = self.currentPlaylistIndex(null);
            var length = self.playlist.length;

            var requiresNativeControls = false;

            if (self.currentMediaRenderer && !self.currentMediaRenderer.enableCustomVideoControls) {
                requiresNativeControls = self.currentMediaRenderer.enableCustomVideoControls();
            }

            if (length < 2) {
                $('.videoTrackControl').visible(false);
                return;
            }

            var controls = requiresNativeControls ? '.videoAdvancedControls' : '.videoControls';
            controls = document.querySelector(controls);

            var previousTrackButton = controls.getElementsByClassName('previousTrackButton')[0];
            var nextTrackButton = controls.getElementsByClassName('nextTrackButton')[0];

            if (index === 0) {
                previousTrackButton.setAttribute('disabled', 'disabled');
            } else {
                previousTrackButton.removeAttribute('disabled');
            }

            if ((index + 1) >= length) {
                nextTrackButton.setAttribute('disabled', 'disabled');
            } else {
                nextTrackButton.removeAttribute('disabled');
            }

            $(previousTrackButton).visible(true);
            $(nextTrackButton).visible(true);
        };
    }

    createVideoPlayer(MediaPlayer);

})();