using System;
using System.IO;
using Microsoft.Extensions.CommandLineUtils;
using Hl7.Fhir.Model;
using Hl7.Fhir.Serialization;
using Newtonsoft.Json;
using Hl7.Fhir.Rest;
using System.Collections.Generic;
using System.Threading;
using System.Linq;

namespace _23andMeFHIR
{
    class Program
    {

        private static SemaphoreSlim semaphore;

        static void Main(string[] args)
        {
            var app = new CommandLineApplication();
            app.Name = "23andMeFHIR";
            app.Description = "converts 23andMe genetic report to FHIR MolecularSequence resource and uploads it";
            app.ExtendedHelpText = "Sample Usage: SubmitFHIRBunlde -p exampleBundle.json -s https://ExampleFHIRServer.com/DSTU3";
            app.HelpOption("-?|-h|--help");
            var _23andMePath = app.Option("-p|--pathTo23andMeFile",
                                        "Full path to text file which contains a 23andMe genetic report",
                                        CommandOptionType.SingleValue);
            var serverURL = app.Option("-s|--FHIRServerURL",
                                        "FHIR Server url",
                                        CommandOptionType.SingleValue);
            var patientId = app.Option("-id|--patientId",
                                       "The patient Id for which the MolecularSequence will be associated.",
                                       CommandOptionType.SingleValue);
            var bearerToken = app.Option("-t|--token",
                                         "Authorization bearer token",
                                         CommandOptionType.SingleValue);

            app.OnExecute(() =>
            {
                if (!_23andMePath.HasValue())
                {
                    Console.WriteLine("Path to 23andMe file required");
                    app.ShowHint();
                    return 0;
                }
                if (!serverURL.HasValue())
                {
                    Console.WriteLine("No FHIR server URL specified.");
                    app.ShowHint();
                    return 0;
                }
                Uri result;
                if (!Uri.TryCreate(serverURL.Value(), UriKind.Absolute, out result))
                {
                    Console.WriteLine($"FHIR server URL: {serverURL.Value()} does not appear to be a valid URL.  Please check it and try again.");
                    return 0;
                }

                return ConvertAndUpload(_23andMePath.Value(), serverURL.Value(), patientId.Value(), bearerToken.Value());

            });

            app.Execute(args);
        }

        private static int ConvertAndUpload(string _23andMePath, string serverURL, string patientId, string bearerToken = null)
        {
            IEnumerable<MolecularSequence> sequences;
            StreamReader fileReader;
            try
            {
                fileReader = File.OpenText(_23andMePath);
                sequences = ToSequence(patientId, fileReader);
            }
            catch (Exception ex)
            {
                System.Console.WriteLine($"Unable to open/read 23andMe file {_23andMePath}. Error: {ex.Message}");
                return -1;
            }

            FhirClient client;

            try
            {
                client = new FhirClient(serverURL);
                if (bearerToken != null)
                {
                    client.OnBeforeRequest += (object sender, BeforeRequestEventArgs e) =>
                    {
                        // Replace with a valid bearer token for this server
                        e.RawRequest.Headers.Add("Authorization", "Bearer " + bearerToken);
                    };
                }
            }
            catch (Exception ex)
            {
                System.Console.WriteLine($"Unable to create FHIR client for server {serverURL}. Error: {ex.Message}");
                return -1;
            }

            var uploadTasks = new List<System.Threading.Tasks.Task<Resource>>();
            semaphore = new SemaphoreSlim(10, 10);

            foreach (var s in sequences)
            {
                Console.WriteLine("Starting upload: " + s.Identifier.FirstOrDefault().Value);
                uploadTasks.Add(UploadResourceAsync(s, client));
            }

            while (uploadTasks.Count > 0)
            {
                var uploadTask = System.Threading.Tasks.Task.WhenAny<Resource>(uploadTasks).Result;
                uploadTasks.Remove(uploadTask);
                if (uploadTask.Exception != null)
                {
                    Console.WriteLine($"Error occurred uploading FHIR resource: {uploadTask.Exception.InnerException.Message}");
                }
                if (uploadTask.IsCompletedSuccessfully)
                {
                    if (uploadTask.Result != null)
                    Console.WriteLine($"Finished uploading: {uploadTask.Result.Id}");
                }
            }

            fileReader.Dispose();

            return 0;
        }

        private static async System.Threading.Tasks.Task<Resource> UploadResourceAsync(Resource resource, FhirClient client, bool retry = true)
        {
            await semaphore.WaitAsync();
            try
            {
                return await client.UpdateAsync(resource);
            }
            catch (FhirOperationException fhirEx)
            {
                if (fhirEx.Status == System.Net.HttpStatusCode.TooManyRequests && retry == true)
                {
                    // Take a break and try again
                    Thread.Sleep(200);
                    return await UploadResourceAsync(resource, client, false);
                }
                else
                {
                    Console.WriteLine($"Error uploading resource to FHIR server: {fhirEx.Message}");
                    return null;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error uploading resource to FHIR server: {ex.Message}");
                return null;
            }
            finally
            {
                semaphore.Release();
            }
        }

        public static IEnumerable<MolecularSequence> ToSequence(string patientId, StreamReader stream, Func<MolecularSequence, bool> filter = null)
        {
            //# rsid    chromosome  position    genotype
            //rs4477212   1   82154   AA

            string line;
            while ((line = stream.ReadLine()) != null)
            {
                if (line.StartsWith("#", StringComparison.Ordinal))
                    continue;

                var split = line.Split('\t');

                if (split.Length != 4)
                {
                    continue;
                }

                var s = CreateSequence(
                    patientId,
                    split[0],
                    split[1],
                    int.Parse(split[2]),
                    split[3][0].ToString(),
                    split[3].Length == 2 ? split[3][1].ToString() : null);

                if (filter == null || filter(s))
                    yield return s;
            }
        }

        private static MolecularSequence CreateSequence(string patientId, string rsid, string chromosome, int position, string observedAllele, string referenceAllele)
        {
            var dbSNPUrl = "https://www.ncbi.nlm.nih.gov/snp/";

            return new MolecularSequence
            {
                Id = $"{patientId}-{rsid}",
                Identifier = new List<Identifier>
                {
                    new Identifier(dbSNPUrl, rsid),
                    new Identifier("http://healthexplorerdna/rsid+allele", $"{rsid}-{observedAllele}{referenceAllele}"),
                },
                CoordinateSystem = 0,
                Text = new Narrative
                {
                    Status = Narrative.NarrativeStatus.Generated,
                    Div = $"<div>Genotype of {rsid} is {observedAllele}/{referenceAllele}</div>"
                },
                ReferenceSeq = new MolecularSequence.ReferenceSeqComponent
                {
                    Chromosome = new CodeableConcept
                    {
                        Coding = new List<Coding>
                        {
                            new Coding("http://hl7.org/fhir/chromosome-human", chromosome)
                        }
                    },
                    ReferenceSeqId = new CodeableConcept
                    {
                        Coding = new List<Coding>
                        {
                            new Coding(dbSNPUrl, rsid)
                        }
                    },
                    WindowStart = position,
                    WindowEnd = position,
                },
                Variant = new List<MolecularSequence.VariantComponent>
                {
                    new MolecularSequence.VariantComponent
                    {
                        ObservedAllele = observedAllele,
                        ReferenceAllele = referenceAllele,
                    }
                },
                Patient = new ResourceReference($"Patient/{patientId}")
            };
        }
    }
}
