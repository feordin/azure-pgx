var fhirClient;
function loadMeds(callback) {
    function getMedicationName(medCodings) {
        var coding = medCodings.find(function (c) {
            return c.system == "http://www.nlm.nih.gov/research/umls/rxnorm";
        });
        return coding && coding.display || "Unnamed Medication(TM)";
    }

    FHIR.oauth2.init({
        // The client_id that you should have obtained after registering a client at the EHR.
        clientId: "my_web_app",

        // The scopes that you request from the EHR
        scope: [
            "launch/patient",  // request the current patient
            "openid fhirUser",  // Get the current user
            "online_access",   // request a refresh token
            "patient/*.read",  // read patient data
        ].join(" "),

        redirectUri: "./index.html",

        iss: "https://launch.smarthealthit.org/v/r3/sim/eyJrIjoiMSIsImIiOiJzbWFydC04ODg4ODA0In0/fhir"
    })
        .then(function (client) {

            // Get MedicationRequests for the selected patient
            fhirClient = client;
            client.request("/MedicationRequest?patient=" + client.patient.id, {
                resolveReferences: ["medicationReference"],
                graph: true
            })

                // Reject if no MedicationRequests are found
                .then(function (data) {
                    if (!data.entry || !data.entry.length) {
                        throw new Error("No medications found for the selected patient");
                    }
                    return data.entry;
                })

                // Build an array of medication names
                .then(function (entries) {
                    return entries.map(function (item) {
                        return getMedicationName(
                            client.getPath(item, "resource.medicationCodeableConcept.coding") ||
                            client.getPath(item, "resource.medicationReference.code.coding")
                        );
                    });
                })

                // Render the list
                .then(callback);
        }).catch((err) => console.log(err));
}

function getMedicationNames(medicationList) {
    return medicationList.map(value => value.split(' ')[0].toLowerCase());
}

async function getRelationships(medications) 
{
    medicationNames = getMedicationNames(medications);
    medVarRelationships = getAllRelationships();
    varianceMatches = {};
    var completeVariantIdList = [];
    medicationNames.forEach((value) => {
        varianceMatches[value] = [];
        medVarRelationships
            .filter((entry) => entry.chemicalName === value)
            .forEach((entry) => {
                varianceMatches[value].push(entry);
                if (!completeVariantIdList.includes(entry.variantName))
                {
                  completeVariantIdList.push(entry.variantName);
                }
            });
    });

    var variantList = [];

    // for each identified variant that has a relationship to a drug that the patient is taking
    // let's find out if we have variant informaiton in the database

    var variantQuery = "MolecularSequence?patient=" + fhirClient.patient.id + "&referenceseqid=" + completeVariantIdList[0];
    var promises = [];
    for (i = 1; i < completeVariantIdList.length; i++) {
      // we split the query into batches so it doesn't get too big
      if ((i % 20) == 0){
        promises.push(fhirClient.request(variantQuery).then(function (v) {
          if (v.entry) {
            console.log("Entry is true");
            v.entry.forEach(function(r){
              variantList.push({
                "variantName": r.resource.referenceSeq.referenceSeqId.coding[0].code,
                "referenceAllele": r.resource.variant[0].referenceAllele,
                "observedAllele": r.resource.variant[0].observedAllele
              });
            });
          }
        }));
        var variantQuery = "MolecularSequence?patient=" + fhirClient.patient.id + "&referenceseqid=" + completeVariantIdList[i];
      }
      else{
        variantQuery = variantQuery + "," + completeVariantIdList[i];
      }
    }

    await Promise.all(promises);

    console.log("Variant List for patient has length of : " + variantList.length);
    // now remove any variants for which we do not have
    // data in the FHIR server for the patient
    medicationNames.forEach((value) => {
      var filteredMatches = variantList.filter(entry => {
        return varianceMatches[value].map(match => match.variantName).includes(entry.variantName);
      });
      filteredMatches = filteredMatches.map(entry => {
        const newEntry = entry;
        varianceMatches[value].forEach(match => {
          if(match.variantName === entry.variantName) {
            newEntry.variantId = match.variantId;
            newEntry.chemicalId = match.chemicalId;
            newEntry.chemicalName = match.chemicalName;
          }
        });
        return newEntry;
      });
      console.log("Lenght of filtered matches: " + filteredMatches.length);
      varianceMatches[value] = filteredMatches;
    });
    
    return varianceMatches;
}

function makeVarianceListItem(list, variance) {
    const newItem = list.querySelector(".varianceTemplate").cloneNode(true)
    newItem.querySelector('.variantName').textContent = variance.variantName;
    newItem.querySelector('.variantName').setAttribute('href', `https://www.pharmgkb.org/chemical/${variance.chemicalId}/clinicalAnnotation`);
    newItem.querySelector('.observed').textContent = variance.observedAllele;
    newItem.querySelector('.reference').textContent = variance.referenceAllele;
    
    list.appendChild(newItem);
    newItem.removeAttribute('hidden');
}

function makeResultCard(medName, varianceList) {
    const newCard = document.getElementById('resultTemplate').cloneNode(true);
    newCard.setAttribute('id', medName + 'Card');

    const cardHeader = newCard.querySelector('.medicationHeader');
    cardHeader.setAttribute('data-target', '#' + medName);
    cardHeader.setAttribute('aria-controls', medName);

    newCard.querySelector('.medicationName').textContent = medName.substring(0, 1).toUpperCase() + medName.substring(1);
    newCard.querySelector('.collapse').setAttribute('id', medName);

    const list = newCard.querySelector('.varianceList');
    varianceList.forEach(entry => makeVarianceListItem(list, entry));

    document.getElementById('resultsDisplay').appendChild(newCard);
    newCard.removeAttribute('hidden');
}

function displayRelationships(medications) {
    getRelationships(medications).then(function(relationships){
    Object.keys(relationships).forEach(medName => makeResultCard(medName, relationships[medName]));
  });
}
