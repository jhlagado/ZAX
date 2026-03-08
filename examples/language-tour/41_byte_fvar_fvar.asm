; ZAX lowered .asm trace
; range: $0100..$2061 (end exclusive)

; func byte_fvar_fvar begin
byte_fvar_fvar:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push AF                        ; 010B: F5
push BC                        ; 010C: C5
push DE                        ; 010D: D5
ex DE, HL                      ; 010E: EB
ld E, (IX + $0006)             ; 010F: DD 5E 06
ld D, (IX + $0007)             ; 0112: DD 56 07
ex DE, HL                      ; 0115: EB
push HL                        ; 0116: E5
pop HL                         ; 0117: E1
push HL                        ; 0118: E5
ld E, (IX + $0004)             ; 0119: DD 5E 04
ld D, (IX + $0005)             ; 011C: DD 56 05
ex DE, HL                      ; 011F: EB
pop DE                         ; 0120: D1
add HL, DE                     ; 0121: 19
push HL                        ; 0122: E5
pop HL                         ; 0123: E1
pop DE                         ; 0124: D1
pop BC                         ; 0125: C1
pop AF                         ; 0126: F1
ld A, (hl)                     ; 0127: 7E
push AF                        ; 0128: F5
push AF                        ; 0129: F5
push BC                        ; 012A: C5
push DE                        ; 012B: D5
ex DE, HL                      ; 012C: EB
ld E, (IX + $0006)             ; 012D: DD 5E 06
ld D, (IX + $0007)             ; 0130: DD 56 07
ex DE, HL                      ; 0133: EB
push HL                        ; 0134: E5
pop HL                         ; 0135: E1
push HL                        ; 0136: E5
ld E, (IX + $0004)             ; 0137: DD 5E 04
ld D, (IX + $0005)             ; 013A: DD 56 05
ex DE, HL                      ; 013D: EB
pop DE                         ; 013E: D1
add HL, DE                     ; 013F: 19
push HL                        ; 0140: E5
pop HL                         ; 0141: E1
pop DE                         ; 0142: D1
pop BC                         ; 0143: C1
pop AF                         ; 0144: F1
ld (hl), A                     ; 0145: 77
pop AF                         ; 0146: F1
ld H, $0000                    ; 0147: 26 00
ld L, A                        ; 0149: 6F
__zax_epilogue_0:
pop DE                         ; 014A: D1
pop BC                         ; 014B: C1
pop AF                         ; 014C: F1
ld SP, IX                      ; 014D: DD F9
pop IX                         ; 014F: DD E1
ret                            ; 0151: C9
; func byte_fvar_fvar end
; func main begin
main:
push IX                        ; 0152: DD E5
ld IX, $0000                   ; 0154: DD 21 00 00
add IX, SP                     ; 0158: DD 39
push AF                        ; 015A: F5
push BC                        ; 015B: C5
push DE                        ; 015C: D5
push HL                        ; 015D: E5
ld HL, $0005                   ; 015E: 21 05 00
push HL                        ; 0161: E5
ld HL, glob_bytes              ; 0162: 21 00 00
push HL                        ; 0165: E5
call byte_fvar_fvar            ; 0166: CD 00 00
inc SP                         ; 0169: 33
inc SP                         ; 016A: 33
inc SP                         ; 016B: 33
inc SP                         ; 016C: 33
__zax_epilogue_1:
pop HL                         ; 016D: E1
pop DE                         ; 016E: D1
pop BC                         ; 016F: C1
pop AF                         ; 0170: F1
ld SP, IX                      ; 0171: DD F9
pop IX                         ; 0173: DD E1
ret                            ; 0175: C9
; func main end

; symbols:
; label byte_fvar_fvar = $0100
; label __zax_epilogue_0 = $014A
; label main = $0152
; label __zax_epilogue_1 = $016D
; data glob_bytes = $2000
; label __zax_startup = $2008
