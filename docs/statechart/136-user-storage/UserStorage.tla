--------------------------- MODULE UserStorage ---------------------------
EXTENDS Naturals
VARIABLES phase, folder, firstFolder, objectExists, metadata, caller,
          reply, bucketRead, twitchAccount, runtime, destination
vars == <<phase, folder, firstFolder, objectExists, metadata, caller,
          reply, bucketRead, twitchAccount, runtime, destination>>
Init == /\ phase = "Start"
        /\ folder = 0 /\ firstFolder = 0
        /\ objectExists = FALSE /\ metadata = FALSE
        /\ caller = "Anonymous" /\ reply = "None" /\ bucketRead = FALSE
        /\ twitchAccount = "SharedTwitchAccount"
        /\ runtime \in {"Hosted", "Local"} /\ destination = "None"
Allocate == /\ runtime = "Hosted" /\ phase = "Start"
            /\ \E uuid \in {1, 2}: folder' = uuid /\ firstFolder' = uuid
            /\ phase' = "Folder ready" /\ destination' = "Hosted"
            /\ UNCHANGED <<objectExists, metadata, caller, reply, bucketRead,
                            twitchAccount, runtime>>
BeginUpload == /\ phase = "Folder ready" /\ phase' = "Uploading"
               /\ UNCHANGED <<folder, firstFolder, objectExists, metadata,
                               caller, reply, bucketRead, twitchAccount,
                               runtime, destination>>
ObjectUploaded == /\ phase = "Uploading" /\ phase' = "Uploaded privately"
                  /\ objectExists' = TRUE
                  /\ UNCHANGED <<folder, firstFolder, metadata, caller, reply,
                                  bucketRead, twitchAccount, runtime, destination>>
Publish == /\ phase = "Uploaded privately" /\ phase' = "Ready"
           /\ metadata' = TRUE
           /\ UNCHANGED <<folder, firstFolder, objectExists, caller, reply,
                           bucketRead, twitchAccount, runtime, destination>>
Fail == /\ phase \in {"Uploading", "Uploaded privately"}
        /\ phase' = "Failed" /\ metadata' = FALSE
        /\ UNCHANGED <<folder, firstFolder, objectExists, caller, reply,
                        bucketRead, twitchAccount, runtime, destination>>
Cleanup == /\ phase = "Failed" /\ objectExists
           /\ objectExists' = FALSE
           /\ UNCHANGED <<phase, folder, firstFolder, metadata, caller, reply,
                           bucketRead, twitchAccount, runtime, destination>>
SignInOwner == /\ caller # "Owner" /\ caller' = "Owner"
               /\ reply' = "None" /\ bucketRead' = FALSE
               /\ UNCHANGED <<phase, folder, firstFolder, objectExists, metadata,
                               twitchAccount, runtime, destination>>
SignInOther == /\ caller # "Other user" /\ caller' = "Other user"
               /\ reply' = "None" /\ bucketRead' = FALSE
               /\ UNCHANGED <<phase, folder, firstFolder, objectExists, metadata,
                               twitchAccount, runtime, destination>>
SignOut == /\ caller # "Anonymous" /\ caller' = "Anonymous"
           /\ reply' = "None" /\ bucketRead' = FALSE
           /\ UNCHANGED <<phase, folder, firstFolder, objectExists, metadata,
                           twitchAccount, runtime, destination>>
Read == /\ runtime = "Hosted"
        /\ reply' = IF caller = "Anonymous" THEN "401"
                    ELSE IF caller = "Owner" /\ metadata THEN "Bytes"
                    ELSE "404"
        /\ bucketRead' = (caller = "Owner" /\ metadata)
        /\ UNCHANGED <<phase, folder, firstFolder, objectExists, metadata,
                        caller, twitchAccount, runtime, destination>>
Reconnect == /\ twitchAccount = "SharedTwitchAccount"
             /\ twitchAccount' = "ReplacementTwitchAccount"
             /\ UNCHANGED <<phase, folder, firstFolder, objectExists, metadata,
                             caller, reply, bucketRead, runtime, destination>>
ExplicitLocal == /\ runtime = "Local" /\ phase = "Start"
                 /\ phase' = "Local file" /\ destination' = "Local"
                 /\ UNCHANGED <<folder, firstFolder, objectExists, metadata,
                                 caller, reply, bucketRead, twitchAccount, runtime>>
Done == /\ phase \in {"Ready", "Failed", "Local file"}
        /\ UNCHANGED vars
Next == Allocate \/ BeginUpload \/ ObjectUploaded \/ Publish \/ Fail \/ Cleanup
        \/ SignInOwner \/ SignInOther \/ SignOut \/ Read \/ Reconnect
        \/ ExplicitLocal \/ Done
OwnerOnlyRead == (reply = "Bytes" \/ bucketRead) => caller = "Owner"
AnonymousDenied == caller = "Anonymous" => reply \in {"None", "401"}
PendingUnreadable == ~metadata => ~bucketRead /\ reply # "Bytes"
ReadyHasObject == metadata => objectExists /\ phase = "Ready"
FolderStable == folder = firstFolder
NoSilentFallback == runtime = "Hosted" => destination # "Local"
=============================================================================
