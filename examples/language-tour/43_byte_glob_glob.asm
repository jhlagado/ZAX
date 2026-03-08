; ZAX lowered .asm trace
; range: $0100..$206B (end exclusive)

; func byte_glob_glob begin
byte_glob_glob:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push AF                        ; 010B: F5
push BC                        ; 010C: C5
push DE                        ; 010D: D5
ld hl, (glob_idx_word)         ; 010E: 2A 00 00
push HL                        ; 0111: E5
pop HL                         ; 0112: E1
push HL                        ; 0113: E5
ld HL, glob_bytes              ; 0114: 21 00 00
pop DE                         ; 0117: D1
add HL, DE                     ; 0118: 19
push HL                        ; 0119: E5
pop HL                         ; 011A: E1
pop DE                         ; 011B: D1
pop BC                         ; 011C: C1
pop AF                         ; 011D: F1
ld A, (hl)                     ; 011E: 7E
push AF                        ; 011F: F5
push BC                        ; 0120: C5
push DE                        ; 0121: D5
ld hl, (glob_idx_word)         ; 0122: 2A 00 00
push HL                        ; 0125: E5
pop HL                         ; 0126: E1
push HL                        ; 0127: E5
ld HL, glob_bytes              ; 0128: 21 00 00
pop DE                         ; 012B: D1
add HL, DE                     ; 012C: 19
push HL                        ; 012D: E5
pop HL                         ; 012E: E1
pop DE                         ; 012F: D1
pop BC                         ; 0130: C1
pop AF                         ; 0131: F1
ld (hl), A                     ; 0132: 77
ld H, $0000                    ; 0133: 26 00
ld L, A                        ; 0135: 6F
__zax_epilogue_0:
pop DE                         ; 0136: D1
pop BC                         ; 0137: C1
pop AF                         ; 0138: F1
ld SP, IX                      ; 0139: DD F9
pop IX                         ; 013B: DD E1
ret                            ; 013D: C9
; func byte_glob_glob end
; func main begin
main:
push IX                        ; 013E: DD E5
ld IX, $0000                   ; 0140: DD 21 00 00
add IX, SP                     ; 0144: DD 39
push AF                        ; 0146: F5
push BC                        ; 0147: C5
push DE                        ; 0148: D5
push HL                        ; 0149: E5
call byte_glob_glob            ; 014A: CD 00 00
__zax_epilogue_1:
pop HL                         ; 014D: E1
pop DE                         ; 014E: D1
pop BC                         ; 014F: C1
pop AF                         ; 0150: F1
ld SP, IX                      ; 0151: DD F9
pop IX                         ; 0153: DD E1
ret                            ; 0155: C9
; func main end

; symbols:
; label byte_glob_glob = $0100
; label __zax_epilogue_0 = $0136
; label main = $013E
; label __zax_epilogue_1 = $014D
; data glob_bytes = $2000
; data glob_idx_word = $2008
; label __zax_startup = $200A
