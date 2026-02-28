; ZAX lowered .asm trace
; range: $0100..$2008 (end exclusive)

; func byte_glob_fvar begin
byte_glob_fvar:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ld e, (ix+$04)                 ; 010B: DD 5E 04
ld d, (ix+$05)                 ; 010E: DD 56 05
ex de, hl                      ; 0111: EB
push HL                        ; 0112: E5
pop HL                         ; 0113: E1
push HL                        ; 0114: E5
ld HL, glob_bytes              ; 0115: 21 00 00
pop DE                         ; 0118: D1
add HL, DE                     ; 0119: 19
push HL                        ; 011A: E5
pop HL                         ; 011B: E1
ld A, (hl)                     ; 011C: 7E
push AF                        ; 011D: F5
ld e, (ix+$04)                 ; 011E: DD 5E 04
ld d, (ix+$05)                 ; 0121: DD 56 05
ex de, hl                      ; 0124: EB
push HL                        ; 0125: E5
pop HL                         ; 0126: E1
push HL                        ; 0127: E5
ld HL, glob_bytes              ; 0128: 21 00 00
pop DE                         ; 012B: D1
add HL, DE                     ; 012C: 19
push HL                        ; 012D: E5
pop HL                         ; 012E: E1
ld (hl), A                     ; 012F: 77
pop AF                         ; 0130: F1
ld H, $0000                    ; 0131: 26 00
ld L, A                        ; 0133: 6F
__zax_epilogue_0:
pop DE                         ; 0134: D1
pop BC                         ; 0135: C1
pop AF                         ; 0136: F1
ld SP, IX                      ; 0137: DD F9
pop IX                         ; 0139: DD E1
ret                            ; 013B: C9
; func byte_glob_fvar end
; func main begin
main:
push IX                        ; 013C: DD E5
ld IX, $0000                   ; 013E: DD 21 00 00
add IX, SP                     ; 0142: DD 39
push AF                        ; 0144: F5
push BC                        ; 0145: C5
push DE                        ; 0146: D5
push HL                        ; 0147: E5
ld HL, $0002                   ; 0148: 21 02 00
push HL                        ; 014B: E5
call byte_glob_fvar            ; 014C: CD 00 00
inc SP                         ; 014F: 33
inc SP                         ; 0150: 33
__zax_epilogue_1:
pop HL                         ; 0151: E1
pop DE                         ; 0152: D1
pop BC                         ; 0153: C1
pop AF                         ; 0154: F1
ld SP, IX                      ; 0155: DD F9
pop IX                         ; 0157: DD E1
ret                            ; 0159: C9
; func main end

; symbols:
; label byte_glob_fvar = $0100
; label __zax_epilogue_0 = $0134
; label main = $013C
; label __zax_epilogue_1 = $0151
; data glob_bytes = $2000
