import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Image, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { usePacking } from '../../../src/hooks/usePacking';
import { useShow } from '../../../src/hooks/useShow';
import { PackingBox } from '../../../src/types/packing';
import { Show } from '../../../src/types';
import * as Print from 'expo-print';
import QRCodeLib from 'qrcode';

// Import images using relative paths with .webp extension
import handleCareImage from '../../../assets/packing-symbols/handle-care.webp';
import fragileImage from '../../../assets/packing-symbols/fragile.webp';
import thisWayUpImage from '../../../assets/packing-symbols/this-way-up.webp';
import keepDryImage from '../../../assets/packing-symbols/keep-dry.webp';

// Base64 encoded image data URLs. Replace the placeholder comments with actual Base64 strings.
const HANDLE_CARE_BASE64 = 'data:image/webp;base64,UklGRqACAABXRUJQVlA4WAoAAAAQAAAAxwAAxwAAQUxQSAMCAAABDzD/ERFCbqtt1di8iIKSNh2LREJZLJDKpUfIKEHybQ0sL4A7LBHe4oePL/dLFdH/CeBvN7SZ1OZ/DO/1qFZotRqd1mDQIpNSJml0Kkmn00kGnUkyqmReVcrCarSF1xiLqMG1QtmYs7ZxZ2MT9OJZ2/izurFneYOjbOYiZXNk+yLUM18Xrh0M5JgXZhhEyTSZuCTQ5CShzbSDZCg0hSeukfSNpkoyXWYoJG3XSCCJeTEHNJMxU8V2+qrjK23TiZlm6BAfQSX7rmg5NK2ArpUwtfiJanf/IeAEu3Q2NvGsbfyJQdlYFBmADQBR6gZzEVG8bDj0RUCNUxKnQ104tBOPvDBoacgCcElAP4nA4B0jMBQa7+gVElB4RwvMg0EAvCMAxilJi3kXgXzATgP0u3AJFDVaoN45oNDLXumAfGeAyhvZywUfcHmS3dFj3fgiu2HYdD7LbgWDrzLPKOiyMNNmpoM4uWEcsjQkkxB1mkVmoARko10U+pPXTeUtk2TymW7zJBu8o1803jFKOp82nc8MsluGzaus8ZZxMfhGL6n8zLSYfKOTfdmQX2klhSQ3lOWLAZAvRqVcIMHF6kySDkAlmWSDpAfQSEa9IOskA4B+1kReZ5B0skoy6hSRlWWR+U4gwsEUJL14MvS6IOj5k6ZXBe6kCOy/p0yGlTlR/EdHNf52AwBWUDggdgAAAFAMAJ0BKsgAyAA+bTaZSaQjIqEgSACADYlpbuF2sRtAE9r0VcIMghqqTXbaLhBkENVSa7bRcIMghqqTXbaLhBkENVSa7bRcIMghqqTXbaLhBkENVSa7bRcIMghqqTXbaLhBkENVSa7bRZwAAP7/1gAAAAAAAAA=';
const FRAGILE_BASE64 = 'data:image/webp;base64,UklGRngBAABXRUJQVlA4WAoAAAAQAAAAxwAAxwAAQUxQSNsAAAABDzD/ERECcmzbbZuviCVLQCksLRam1AjdAbxLGDyHj8FDcPYiov8TgE+3sDHQws/eGZAAwPA6DoobPoaxvL4p54bYpqzldRnEteShOJPDVxBYMBXs0JClghvvUsFdBfc8V8FDBb68QTGUUAHK63kn1hjZMfSSJLJpQtCE4HMNjAelL8oplrEqHeOsGMao7BiibCjhnVA8gIHjAFjOGUDHGQHsOOIxCGlFxxJs/r0ZsWMB2HAcAMsJAEA5471hOMUyvAIG9E3aOWLSXMSmPUT6NB8Z0tJ/6EDDpxsAVlA4IHYAAABQDACdASrIAMgAPm02mUmkIyKhIEgAgA2JaW7hdrEbQBPa9FXCDIIaqk122i4QZBDVUmu20XCDIIaqk122i4QZBDVUmu20XCDIIaqk122i4QZBDVUmu20XCDIIaqk122i4QZBDVUmu20WcAAD+/9YAAAAAAAAA';
const THIS_WAY_UP_BASE64 = 'data:image/webp;base64,UklGRjYBAABXRUJQVlA4WAoAAAAQAAAAxwAAxwAAQUxQSJoAAAABDzD/ERHCcWxbbfOUl5RAKZQGpVGKStDSkefwR/87Z09E/yeAdzesGc3Km0KqhFTpciPk5ozGQRgH3eSEyZ3RwgsLr9sEYRN05QRRKFFHCqQqScmmkipNJhsAmWw0ozTaDNKgmUgHYCKdZiEtbLzkNRsyANiQQVOkQkaDaESSAEhSgxJxXCL+v9A/lTLnN8+hao7pi45mvLsBVlA4IHYAAABQDACdASrIAMgAPm02mUmkIyKhIEgAgA2JaW7hdrEbQBPa9FXCDIIaqk122i4QZBDVUmu20XCDIIaqk122i4QZBDVUmu20XCDIIaqk122i4QZBDVUmu20XCDIIaqk122i4QZBDVUmu20WcAAD+/9YAAAAAAAAA';
const KEEP_DRY_BASE64 = 'data:image/webp;base64,UklGRvwBAABXRUJQVlA4WAoAAAAQAAAAxwAAxwAAQUxQSGABAAABDzD/ERFCkm3tbds8uCEd04yMLEOjYFvpxNKQnWAJGKow/FKon396Pyei/xOgH268Nbktv/2W4KYAT2jU4LJj0Hye8ozhUgtvmHGaWFxarl8BxakmCm9ciNyy27RIWC1DUvbRp8GjryTgzpZ5ZQIe8NhUtR4gcWvqZxIt1Wzanyn02GzLmYkRe7JUnQ9bmiFuGYY0Lm17Q+mXLVpmw1QhWGRlfa2aLm3NFG3dlIBwbpgyNMPeVGAYZtMEs2Hxkx0WnIKlbri0tA2RV+f6pp1X4tOV8aVky/5LKZb5S5ksy2fISJr0TlIYMgW6FPVWymAqUCUUFl3C3pKApaCwF9CDIQL7jEIvQDPUAIyIQssAFoB+iUJNn6x+stoCCkSPunLhAZ/J+r+CffxBSZ8Hr+o0sl+heU30yaeL4dR0ORcvyalKyj5ISk6LFJ1m6dJpLwWnrgmnquzFHrfNv+nkph9uVlA4IHYAAABQDACdASrIAMgAPm02mUmkIyKhIEgAgA2JaW7hdrEbQBPa9FXCDIIaqk122i4QZBDVUmu20XCDIIaqk122i4QZBDVUmu20XCDIIaqk122i4QZBDVUmu20XCDIIaqk122i4QZBDVUmu20WcAAD+/9YAAAAAAAAA';

export default function LabelPreviewPage() {
  const router = useRouter();
  const { id: boxId, showId } = useLocalSearchParams<{ id: string, showId?: string }>();
  
  console.log(`[LabelPreviewPage] Received boxId: ${boxId}, showId: ${showId}`);

  const [handlingNote, setHandlingNote] = useState('');
  const [includeFragile, setIncludeFragile] = useState(false);
  const [includeThisWayUp, setIncludeThisWayUp] = useState(false);
  const [includeKeepDry, setIncludeKeepDry] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [qrDataURL, setQrDataURL] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(true);
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Get showId from context or route params if needed for usePacking
  const { boxes, loading: packingLoading, error: packingError, updateBoxLabelSettings, getDocument } = usePacking(showId);
  const [box, setBox] = useState<PackingBox | null>(null);
  const { show, loading: showLoading, error: showError } = useShow(showId);

  const hasFragileItems = box?.props?.some(p => p.isFragile) ?? false;
  // Calculate total weight
  const totalWeightKg = box?.props?.reduce((sum, p) => sum + (p.weight || 0), 0) ?? 0;
  const weightUnit = box?.weightUnit || 'kg'; // Use unit from box or default

  const origin = Platform.OS === 'web' ? window.location.origin : 'https://yourapp.com';
  const qrValue = boxId && showId ?
    `${origin}/(web)/packing/box/${boxId}?showId=${showId}` :
    'Error: Missing ID';

  useEffect(() => {
    console.log(`[LabelPreviewPage Init Effect] Running. boxId=${boxId}, boxes.length=${boxes.length}, showId=${showId}`);
    if (!showId) {
        console.error("Label page requires showId param");
        return;
    }
    if (boxId && boxes.length > 0) {
      console.log(`[LabelPreviewPage Init Effect] Searching for boxId=${boxId} in boxes array...`);
      const foundBox = boxes.find(b => b.id === boxId);
      console.log(`[LabelPreviewPage Init Effect] Found box:`, foundBox ? { id: foundBox.id, name: foundBox.name, labelIncludeFragile: foundBox.labelIncludeFragile, labelIncludeThisWayUp: foundBox.labelIncludeThisWayUp, labelIncludeKeepDry: foundBox.labelIncludeKeepDry } : 'Not Found');
      
      setBox(foundBox || null);
      if (foundBox) {
        // Initialize state from loaded box data or defaults
        const initialNote = foundBox.labelHandlingNote ?? '';
        const initialFragile = foundBox.labelIncludeFragile ?? foundBox.props?.some(p => p.isFragile) ?? false;
        const initialThisWayUp = foundBox.labelIncludeThisWayUp ?? false;
        const initialKeepDry = foundBox.labelIncludeKeepDry ?? false;

        console.log('[LabelPreviewPage Init Effect] Will set state with values:');
        console.log('  - Note:', initialNote);
        console.log('  - Fragile:', initialFragile);
        console.log('  - ThisWayUp:', initialThisWayUp);
        console.log('  - KeepDry:', initialKeepDry);

        setIncludeFragile(initialFragile);
        setIncludeThisWayUp(initialThisWayUp);
        setIncludeKeepDry(initialKeepDry);
        setHandlingNote(initialNote);
      }
    }
  }, [boxId, boxes, showId]);

  useEffect(() => {
    if (qrValue && qrValue !== 'Error: Missing ID') {
      const generateQr = async () => {
        try {
          console.log(`[LabelPreviewPage] Generating QR code for value: ${qrValue}`);
          const url = await QRCodeLib.toDataURL(qrValue, { width: 250, margin: 2 });
          console.log(`[LabelPreviewPage] QR code data URL generated successfully.`);
          setQrDataURL(url);
        } catch (qrError) {
          console.error("[LabelPreviewPage] Error generating QR code data URL:", qrError);
          setQrDataURL(null);
          Alert.alert('Error', 'Could not generate QR code for preview.');
        }
      };
      generateQr();
    } else {
      console.warn('[LabelPreviewPage] QR code value is missing or invalid, cannot generate QR.');
      setQrDataURL(null);
    }
  }, [qrValue]);

  useEffect(() => {
    console.log('[LabelPreviewPage] HTML Effect Triggered:');
    console.log('  - box available:', !!box);
    console.log('  - qrDataURL available:', !!qrDataURL);
    console.log('  - packingLoading:', packingLoading);
    console.log('  - show available:', !!show);
    console.log('  - showLoading:', showLoading);

    if (box && qrDataURL && show) {
      console.log('[LabelPreviewPage] Generating HTML content...');

      // Define image styles for the HTML
      const imgStyle = 'height: 50px; width: 50px; display: inline-block; margin: 2px;'; // Adjusted for flex flow

      // Build symbols HTML string directly, concatenating selected images
      let symbolsHtml = '';
      if (includeFragile || hasFragileItems) {
        symbolsHtml += `<img src="${HANDLE_CARE_BASE64}" alt="Handle With Care" style="${imgStyle}" />`;
      }
      if (includeFragile) {
        symbolsHtml += `<img src="${FRAGILE_BASE64}" alt="Fragile" style="${imgStyle}" />`;
      } 
      if (includeThisWayUp) {
        symbolsHtml += `<img src="${THIS_WAY_UP_BASE64}" alt="This Way Up" style="${imgStyle}" />`;
      }
      if (includeKeepDry) {
        symbolsHtml += `<img src="${KEEP_DRY_BASE64}" alt="Keep Dry" style="${imgStyle}" />`;
      }

      const boxNumber = box.sceneNumber ?? '-';
      const totalBoxes = boxes.length;

      const generatedHtml = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              @page {
                size: A5;
                margin: 10mm; /* Add default margins for A5 */
              }
              body { font-family: sans-serif; margin: 0; padding: 0; }
              .label-container { 
                width: 128mm; /* Adjust width to fit A5 minus margins */
                /* max-width: 600px; */ /* Remove or adjust max-width */
                border: 3px solid black; 
                margin: 0 auto; /* Center on page */
                background-color: #fff; 
                color: #000; 
              }
              table { width: 100%; border-collapse: collapse; }
              td { padding: 8px; vertical-align: top; border: 1px solid #ccc; }
              .header-left { width: 30%; font-size: 24px; font-weight: bold; text-align: center; vertical-align: middle; border-right: 3px solid black; line-height: 1.2; }
              .header-right { width: 70%; text-align: center; padding: 10px; vertical-align: middle; }
              .header-right-content { 
                display: flex; 
                align-items: center; 
                justify-content: center; /* Center items horizontally */
                flex-wrap: wrap; /* Allow items to wrap */
                gap: 8px; 
              }
              .qr-code { width: 200px; height: 200px; display: block; flex-shrink: 0; } /* Increased size */
              .symbols-inline-container { 
                 /* This class is now less relevant, styles applied directly or to images */
                 max-width: 90px; /* Constrain the symbol area slightly */
                 line-height: 0; /* Prevent extra space from inline-block */
              }
              .content-cell { padding: 15px; border-top: 3px solid black; }
              .box-name { font-size: 24px; font-weight: bold; margin-bottom: 8px; text-align: left; }
              .info-row { display: flex; justify-content: space-between; margin-top: 10px; font-size: 14px; }
              .notes-label { font-weight: bold; display: block; margin-bottom: 3px; font-size: 12px; }
              .notes-content { font-size: 14px; word-wrap: break-word; }
              .notes-section { /* Removed margin-top, handled by info-row now */ }
              .weight-label { font-weight: bold; font-size: 12px; }
              .weight-value { font-size: 14px; }
              /* Added style for the show name cell */
              .show-name-cell { 
                padding: 10px; 
                font-size: 20px; 
                font-weight: bold; 
                text-align: center; 
                border-bottom: 3px solid black; /* Make bottom border thick */
              }
            </style>
          </head>
          <body>
            <div class="label-container">
              <table>
                <tr>
                  <td colspan="2" class="show-name-cell">
                    ${show.name || 'Show Name Unavailable'}
                  </td>
                </tr>
                <tr>
                  <td class="header-left">
                  <br/>Box<br/>${boxNumber} of ${totalBoxes}<br/><br/><br/>
                  <div class="weight-section">
                      <span class="weight-label">Approx Weight:</span><br/>
                      <strong class="weight-value">${totalWeightKg.toFixed(1)} ${weightUnit}</strong>
                  </div>
                  </td>
                  <td class="header-right">
                    <div class="header-right-content">
                      <img src="${qrDataURL}" alt="QR Code" class="qr-code" />
                      ${symbolsHtml ? 
                        `<div class="symbols-inline-container">${symbolsHtml}</div>` : ''}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" class="content-cell">
                    <div class="box-name">${box.name || 'Packing Box'}</div>
                    <div class="info-row">
                       <div class="notes-section">
                         <span class="notes-label">Handling Notes:</span>
                         <span class="notes-content">${handlingNote || 'N/A'}</span>
                       </div>
                      
                    </div>
                  </td>
                </tr>
              </table>
            </div>
          </body>
        </html>
      `;
      setHtmlContent(generatedHtml);
      setIsGeneratingPreview(false); // Successfully generated
    } else {
      console.log('[LabelPreviewPage] Setting htmlContent to null because a dependency is missing or loading.');
      setHtmlContent(null);
      // Adjust isGeneratingPreview logic - depends only on packingLoading now
      const doneLoading = !packingLoading && !showLoading;
      const missingDeps = !box || !qrDataURL || !show;
      setIsGeneratingPreview(doneLoading && missingDeps);
    }
  }, [box, qrDataURL, show, handlingNote, includeFragile, includeThisWayUp, includeKeepDry, hasFragileItems, packingLoading, showLoading, boxes.length]);

  // Debounced save function (to be implemented within usePacking ideally)
  const handleSettingChange = useCallback(async (settings: Partial<PackingBox>) => {
      // Check if both boxId (from params) and box (from state) are available AND match
      if (!boxId || !box || box.id !== boxId) { 
        console.warn(`[LabelPreviewPage] Attempted to save settings but box state is not ready or mismatched. Aborting. boxId=${boxId}, box?.id=${box?.id}`);
        return;
      }
      
      // Diagnostic: Explicitly check if Firestore can find the doc right now
      console.log(`[LabelPreviewPage] Pre-update check: Attempting getDocument for ID: ${boxId}`);
      const docExists = await getDocument(boxId);
      if (!docExists) {
        console.error(`[LabelPreviewPage] Pre-update check FAILED: getDocument could not find ${boxId}. Aborting update.`);
        Alert.alert('Save Error', 'Could not find the box data to save to. Please try again later.');
        return;
      }
      console.log(`[LabelPreviewPage] Pre-update check SUCCESS: Found document ${boxId}. Proceeding with update.`);

      console.log(`[LabelPreviewPage] Saving settings for box ${boxId}:`, settings);
      
      try {
        await updateBoxLabelSettings(boxId, settings);
        console.log('[LabelPreviewPage] Settings saved successfully.')
      } catch (error) {
        console.error('[LabelPreviewPage] Error saving settings:', error);
        Alert.alert('Save Error', 'Could not save handling note. Please try again.');
      } 
  }, [boxId, box, updateBoxLabelSettings, getDocument]);

  // Update handleHandlingNoteChange to ONLY update local state
  const handleHandlingNoteChange = (text: string) => {
      setHandlingNote(text); // Update local state immediately
  };

  // ADD function to handle saving on blur
  const handleHandlingNoteBlur = async () => {
    console.log('[LabelPreviewPage] Handling Note blurred. Current value:', handlingNote);
    // Optionally check if the note actually changed from the initial state if needed
    
    setIsSavingNote(true); // Start saving indicator
    try {
      await handleSettingChange({ labelHandlingNote: handlingNote });
    } finally {
      setIsSavingNote(false); // Stop saving indicator regardless of outcome
    }
  };

  const handleFragileChange = (value: boolean) => {
      setIncludeFragile(value);
      handleSettingChange({ labelIncludeFragile: value });
  }

  const handleThisWayUpChange = (value: boolean) => {
      setIncludeThisWayUp(value);
      handleSettingChange({ labelIncludeThisWayUp: value });
  }

  const handleKeepDryChange = (value: boolean) => {
      setIncludeKeepDry(value);
      handleSettingChange({ labelIncludeKeepDry: value });
  }

  const handlePrint = async () => {
    if (!htmlContent) {
        Alert.alert('Error', 'Label preview is not ready. Please wait.');
        return;
    }
    setIsPrinting(true);
    
    if (Platform.OS === 'web') {
        // Web-specific print: Inject only label content and styles
        const originalContents = document.body.innerHTML;
        const originalTitle = document.title;
        let tempStyleElement: HTMLStyleElement | null = null;

        try {
            // Use DOMParser to safely parse the htmlContent
            const parser = new DOMParser();
            const printDoc = parser.parseFromString(htmlContent, 'text/html');
            
            // Extract styles
            const styleContent = printDoc.head.querySelector('style')?.textContent || '';
            // Extract label container div
            const labelContainerHTML = printDoc.body.querySelector('.label-container')?.outerHTML || '<p>Error: Label content not found.</p>';

            // Create and append temporary style to main document head
            tempStyleElement = document.createElement('style');
            tempStyleElement.textContent = styleContent;
            document.head.appendChild(tempStyleElement);

            // Set body content to only the label container
            document.body.innerHTML = labelContainerHTML;
            document.title = box?.name || 'Packing Label'; // Set a relevant title for print

            // Add a small delay before printing - sometimes helps render styles
            await new Promise(resolve => setTimeout(resolve, 100)); 

            window.print(); // Trigger browser print dialog

        } catch (error) {
            console.error("Error preparing content for printing:", error);
            Alert.alert('Error', 'Could not prepare content for printing.');
        } finally {
            // IMPORTANT: Restore original page content and title
            document.body.innerHTML = originalContents;
            document.title = originalTitle;
            // Remove temporary style element
            if (tempStyleElement && document.head.contains(tempStyleElement)) {
                document.head.removeChild(tempStyleElement);
            }
            setIsPrinting(false);
        }
    } else {
        // Native print using Expo Print
        try {
          await Print.printAsync({ html: htmlContent });
        } catch (error) {
          console.error("Error printing label (native):", error);
          Alert.alert('Error', 'Could not print the label.');
        } finally {
          setIsPrinting(false);
        }
    }
  };

  if (packingLoading || showLoading || (!box && !packingError && !showId)) {
    return <View style={styles.centered}><ActivityIndicator size="large" /></View>;
  }

  if (packingError || showError) {
    const message = packingError?.message || showError?.message || 'An unknown error occurred';
    return <View style={styles.centered}><Text style={styles.errorText}>Error loading data: {message}</Text></View>;
  }

  if (!showId) {
     return <View style={styles.centered}><Text style={styles.errorText}>Missing required Show ID.</Text></View>;
  }

  if (!box) {
    return <View style={styles.centered}><Text style={styles.errorText}>Box not found for the given Show ID.</Text></View>;
  }

  if (!show) {
    return <View style={styles.centered}><Text style={styles.errorText}>Show details could not be loaded.</Text></View>;
  }

  const renderCheckbox = (label: string, value: boolean, onValueChange: (newValue: boolean) => void) => (
    <TouchableOpacity onPress={() => onValueChange(!value)} style={styles.checkboxContainer}>
      <View style={[styles.checkbox, value && styles.checkboxChecked]}>
        {value && <Text style={styles.checkboxCheckmark}>✓</Text>}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} className="label-page-container">
      <View style={styles.previewSection} className="label-print-hide">
        <Text style={styles.sectionTitle}>Live Preview</Text>
        <View style={styles.webviewContainer} className="label-preview-area">
          {htmlContent ? (
            Platform.OS === 'web' ? (
              <iframe
                srcDoc={htmlContent}
                style={{
                  borderWidth: 0, // Remove iframe default border
                  width: '100%',
                  height: '100%',
                }}
              />
            ) : (
              <WebView
                originWhitelist={['*']} // Allow loading data URLs
                source={{ html: htmlContent }}
                style={styles.webview}
                scrollEnabled={false} // Disable scrolling within the preview if needed
              />
            )
          ) : isGeneratingPreview ? (
            <ActivityIndicator size="large" color="#ccc" />
          ) : (
            <Text style={styles.errorText}>Could not generate preview.</Text>
          )}
        </View>
      </View>

      <Text style={styles.title}>Label Preview: {box.name}</Text>

      <View style={styles.previewSection} className="label-print-hide">
        <Text style={styles.sectionTitle}>Handling Info</Text>
        {hasFragileItems && (
          <Text style={styles.handlingTextWarning}>* Handle with care! *</Text>
        )}
        <Text style={styles.label}>Optional Handling/Warning Note:</Text>
        <View style={styles.noteInputContainer}> 
          <TextInput
            style={styles.input}
            value={handlingNote}
            onChangeText={handleHandlingNoteChange}
            onBlur={handleHandlingNoteBlur}
            placeholder="e.g., This way up, Keep dry"
            placeholderTextColor="#888"
            multiline
          />
          {isSavingNote && (
            <ActivityIndicator size="small" color="#ccc" style={styles.savingIndicator} />
          )}
        </View>
      </View>

      <View style={styles.previewSection} className="label-print-hide">
        <Text style={styles.sectionTitle}>Include Symbols</Text>
        {renderCheckbox('Fragile', includeFragile, handleFragileChange)}
        {renderCheckbox('This Way Up (↑↑)', includeThisWayUp, handleThisWayUpChange)}
        {renderCheckbox('Keep Dry (☂️)', includeKeepDry, handleKeepDryChange)}
      </View>

      <View style={styles.buttonContainer} className="label-print-hide">
        <Button 
          title="Back" 
          onPress={() => { 
            console.log(`[LabelPreviewPage] Back button pressed. Navigating to box detail for boxId=${boxId}, showId=${showId}`); 
            if (boxId && showId) {
              router.push({
                pathname: '/(web)/packing/box/[id]',
                params: { id: boxId, showId: showId },
              });
            } else {
              console.error("[LabelPreviewPage] Missing boxId or showId, falling back to router.back()");
              router.back(); // Fallback if IDs are missing
            }
          }} 
          color="#888" 
        />
        <Button 
          title={isPrinting ? "Generating..." : "Print Label"} 
          onPress={handlePrint} 
          disabled={isPrinting} 
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  contentContainer: {
    padding: 20,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#eee',
    marginBottom: 20,
    textAlign: 'left',
  },
  previewSection: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ccc',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#333',
    color: '#eee',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#444',
    flex: 1,
    marginRight: 5,
  },
  qrContainer: {
    alignSelf: 'center',
    marginVertical: 10,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  handlingTextWarning: {
    color: '#facc15',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorText: {
    color: '#f87171',
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#aaa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#333'
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  checkboxCheckmark: {
      color: '#fff',
      fontSize: 12,
      fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#ccc',
  },
  symbolDisplayContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 8,
    paddingVertical: 15,
    marginBottom: 15,
    flexWrap: 'wrap',
  },
  symbolImage: {
    width: 40,
    height: 40,
    marginHorizontal: 10,
  },
  webviewContainer: {
    aspectRatio: 148 / 210,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#fff',
    alignSelf: 'center',
  },
  webview: {
    flex: 1,
    width: '100%',
    backgroundColor: 'transparent',
  },
  noteInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savingIndicator: {
    marginLeft: 5,
  },
}); 