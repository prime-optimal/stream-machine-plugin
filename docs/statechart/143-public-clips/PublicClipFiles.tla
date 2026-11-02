------------------------- MODULE PublicClipFiles -------------------------
EXTENDS Naturals
VARIABLES phase, writer, caller, target, kind, folder, firstFolder,
          uploadOwner, objectExists, metadata, reply, bucketRead, authUsed
vars == <<phase, writer, caller, target, kind, folder, firstFolder,
          uploadOwner, objectExists, metadata, reply, bucketRead, authUsed>>
Init == /\ phase = "Start"
        /\ writer \in {"Owner", "Anonymous"}
        /\ caller \in {"Owner", "Visitor"}
        /\ target \in {"Artifact", "Other ID", "Folder", "Listing"}
        /\ kind \in {"Clip", "Private"}
        /\ folder = 0 /\ firstFolder = 0 /\ uploadOwner = "None"
        /\ objectExists = FALSE /\ metadata = FALSE
        /\ reply = "None" /\ bucketRead = FALSE /\ authUsed = FALSE
NoReply == /\ reply' = "None" /\ bucketRead' = FALSE /\ authUsed' = FALSE
BeginUpload == /\ phase = "Start" /\ writer = "Owner"
               /\ phase' = "Uploading" /\ folder' = 1 /\ firstFolder' = 1
               /\ uploadOwner' = "Owner" /\ NoReply
               /\ UNCHANGED <<writer, caller, target, kind, objectExists, metadata>>
DenyUpload == /\ phase = "Start" /\ writer = "Anonymous"
              /\ phase' = "Upload denied" /\ NoReply
              /\ UNCHANGED <<writer, caller, target, kind, folder, firstFolder,
                              uploadOwner, objectExists, metadata>>
ObjectUploaded == /\ phase = "Uploading" /\ phase' = "Uploaded privately"
                  /\ objectExists' = TRUE /\ NoReply
                  /\ UNCHANGED <<writer, caller, target, kind, folder, firstFolder,
                                  uploadOwner, metadata>>
Publish == /\ phase = "Uploaded privately" /\ phase' = "Ready"
           /\ metadata' = TRUE /\ NoReply
           /\ UNCHANGED <<writer, caller, target, kind, folder, firstFolder,
                           uploadOwner, objectExists>>
Fail == /\ phase \in {"Uploading", "Uploaded privately"}
        /\ phase' = "Failed" /\ metadata' = FALSE /\ NoReply
        /\ UNCHANGED <<writer, caller, target, kind, folder, firstFolder,
                        uploadOwner, objectExists>>
Cleanup == /\ phase = "Failed" /\ objectExists
           /\ objectExists' = FALSE /\ NoReply
           /\ UNCHANGED <<phase, writer, caller, target, kind, folder, firstFolder,
                           uploadOwner, metadata>>
LoseObject == /\ phase = "Ready" /\ phase' = "Object missing"
              /\ objectExists' = FALSE /\ NoReply
              /\ UNCHANGED <<writer, caller, target, kind, folder, firstFolder,
                              uploadOwner, metadata>>
PublicMatch == target = "Artifact" /\ metadata /\ kind = "Clip"
PrivateMatch == target = "Artifact" /\ metadata /\ caller = "Owner"
Read == /\ reply' = IF objectExists /\ (PublicMatch \/ PrivateMatch)
                    THEN "Representation" ELSE "404"
        /\ bucketRead' = (PublicMatch \/ PrivateMatch)
        /\ authUsed' = ~PublicMatch
        /\ UNCHANGED <<phase, writer, caller, target, kind, folder, firstFolder,
                        uploadOwner, objectExists, metadata>>
Done == /\ phase \in {"Ready", "Object missing", "Failed", "Upload denied"}
        /\ UNCHANGED vars
Next == BeginUpload \/ DenyUpload \/ ObjectUploaded \/ Publish \/ Fail \/ Cleanup
        \/ LoseObject \/ Read \/ Done
PublicLinkWorks == (reply # "None" /\ PublicMatch /\ objectExists)
                  => reply = "Representation" /\ ~authUsed
PrivateOwnerOnly == (kind = "Private" /\ reply = "Representation")
                    => caller = "Owner"
PublishedOnly == reply = "Representation" => metadata /\ objectExists
                 /\ target = "Artifact"
PendingNoBucketRead == ~metadata => ~bucketRead
NoListing == target # "Artifact" => reply \in {"None", "404"} /\ ~bucketRead
FolderStable == folder = firstFolder
AuthenticatedUpload == uploadOwner # "None" => writer = "Owner"
                       /\ uploadOwner = "Owner"
=============================================================================
