; ZAX lowered .asm trace
; range: $0100..$2008 (end exclusive)

; func byte_fvar_fvar begin
byte_fvar_fvar:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ex DE, HL                      ; 010B: EB
ld E, (IX + $0006)             ; 010C: DD 5E 06
ld D, (IX + $0007)             ; 010F: DD 56 07
ex DE, HL                      ; 0112: EB
push HL                        ; 0113: E5
pop HL                         ; 0114: E1
push HL                        ; 0115: E5
push DE                        ; 0116: D5
push IX                        ; 0117: DD E5
pop HL                         ; 0119: E1
ld DE, $0004                   ; 011A: 11 04 00
add HL, DE                     ; 011D: 19
pop DE                         ; 011E: D1
pop DE                         ; 011F: D1
add HL, DE                     ; 0120: 19
push HL                        ; 0121: E5
pop HL                         ; 0122: E1
ld A, (hl)                     ; 0123: 7E
push AF                        ; 0124: F5
ex DE, HL                      ; 0125: EB
ld E, (IX + $0006)             ; 0126: DD 5E 06
ld D, (IX + $0007)             ; 0129: DD 56 07
ex DE, HL                      ; 012C: EB
push HL                        ; 012D: E5
pop HL                         ; 012E: E1
push HL                        ; 012F: E5
push DE                        ; 0130: D5
push IX                        ; 0131: DD E5
pop HL                         ; 0133: E1
ld DE, $0004                   ; 0134: 11 04 00
add HL, DE                     ; 0137: 19
pop DE                         ; 0138: D1
pop DE                         ; 0139: D1
add HL, DE                     ; 013A: 19
push HL                        ; 013B: E5
pop HL                         ; 013C: E1
ld (hl), A                     ; 013D: 77
pop AF                         ; 013E: F1
ld H, $0000                    ; 013F: 26 00
ld L, A                        ; 0141: 6F
__zax_epilogue_0:
pop DE                         ; 0142: D1
pop BC                         ; 0143: C1
pop AF                         ; 0144: F1
ld SP, IX                      ; 0145: DD F9
pop IX                         ; 0147: DD E1
ret                            ; 0149: C9
; func byte_fvar_fvar end
; func main begin
main:
push IX                        ; 014A: DD E5
ld IX, $0000                   ; 014C: DD 21 00 00
add IX, SP                     ; 0150: DD 39
push AF                        ; 0152: F5
push BC                        ; 0153: C5
push DE                        ; 0154: D5
push HL                        ; 0155: E5
ld HL, $0005                   ; 0156: 21 05 00
push HL                        ; 0159: E5
ld HL, glob_bytes              ; 015A: 21 00 00
push HL                        ; 015D: E5
call byte_fvar_fvar            ; 015E: CD 00 00
inc SP                         ; 0161: 33
inc SP                         ; 0162: 33
inc SP                         ; 0163: 33
inc SP                         ; 0164: 33
__zax_epilogue_1:
pop HL                         ; 0165: E1
pop DE                         ; 0166: D1
pop BC                         ; 0167: C1
pop AF                         ; 0168: F1
ld SP, IX                      ; 0169: DD F9
pop IX                         ; 016B: DD E1
ret                            ; 016D: C9
; func main end

; symbols:
; label byte_fvar_fvar = $0100
; label __zax_epilogue_0 = $0142
; label main = $014A
; label __zax_epilogue_1 = $0165
; data glob_bytes = $2000
